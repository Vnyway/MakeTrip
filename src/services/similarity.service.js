const { pool } = require('../config/db');

/**
 * Same weights used in recommendations.service.js for CF scoring —
 * keep them in sync if you ever tune the interaction weights.
 */
const WEIGHT_SQL = `
  CASE interaction_type
    WHEN 'view'            THEN 0.08
    WHEN 'click'           THEN 0.15
    WHEN 'favorite_add'    THEN 1.0
    WHEN 'favorite_remove' THEN -0.35
    WHEN 'booking'         THEN 2.5
    WHEN 'review'          THEN 1.5
    ELSE 0
  END
`;

/**
 * Top-K neighbours stored per user.
 * Keeping this small ensures the CF JOIN in recommendations stays fast.
 */
const TOP_K = 50;

/** Tracks in-progress recalculations: skip duplicate triggers for same user. */
const inFlight = new Set();
/** Tracks users that triggered while their recalc was running: re-run once after. */
const pendingAfter = new Set();

/**
 * Recompute cosine similarity between `userId` and all users who share
 * at least one interacted service. Upserts the top-K results into
 * `user_similarity`; rows for this user that fall outside top-K are deleted.
 */
async function recalcSimilarityForUser(userId) {
  const result = await pool.query(
    `
    WITH user_vectors AS (
      SELECT
        user_id,
        service_id,
        SUM(${WEIGHT_SQL})::float8 AS w
      FROM user_interactions
      GROUP BY user_id, service_id
      HAVING SUM(${WEIGHT_SQL}) > 0
    ),
    target AS (
      SELECT service_id, w FROM user_vectors WHERE user_id = $1
    ),
    neighbors AS (
      SELECT DISTINCT uv.user_id
      FROM user_vectors uv
      INNER JOIN target t ON t.service_id = uv.service_id
      WHERE uv.user_id <> $1
    ),
    dot_products AS (
      SELECT uv.user_id, SUM(uv.w * t.w) AS dot
      FROM user_vectors uv
      INNER JOIN target t ON t.service_id = uv.service_id
      WHERE uv.user_id IN (SELECT user_id FROM neighbors)
      GROUP BY uv.user_id
    ),
    target_norm AS (
      SELECT SQRT(SUM(w * w)) AS norm FROM target
    ),
    neighbor_norms AS (
      SELECT user_id, SQRT(SUM(w * w)) AS norm
      FROM user_vectors
      WHERE user_id IN (SELECT user_id FROM neighbors)
      GROUP BY user_id
    ),
    scores AS (
      SELECT
        dp.user_id AS similar_user_id,
        LEAST(1.0, GREATEST(0.0,
          dp.dot / NULLIF(tn.norm * nn.norm, 0)
        ))::numeric(8,6) AS score
      FROM dot_products dp
      CROSS JOIN target_norm tn
      JOIN neighbor_norms nn ON nn.user_id = dp.user_id
      WHERE dp.dot > 0 AND tn.norm > 0 AND nn.norm > 0
      ORDER BY score DESC
      LIMIT $2
    )
    INSERT INTO user_similarity (user_id, similar_user_id, score, calculated_at)
    SELECT $1, similar_user_id, score, now() FROM scores
    ON CONFLICT (user_id, similar_user_id)
      DO UPDATE SET score = EXCLUDED.score, calculated_at = now()
    `,
    [userId, TOP_K],
  );

  return result.rowCount || 0;
}

/**
 * Debounced entry point called after every interaction write.
 * If a recalc is already running for this user, marks them as pending
 * so exactly one follow-up run executes after the current one finishes.
 */
async function triggerSimilarityUpdate(userId) {
  if (inFlight.has(userId)) {
    pendingAfter.add(userId);
    return;
  }

  inFlight.add(userId);

  try {
    await recalcSimilarityForUser(userId);
  } catch (err) {
    console.error(`[similarity] recalc failed for user ${userId}:`, err.message);
  } finally {
    inFlight.delete(userId);

    if (pendingAfter.has(userId)) {
      pendingAfter.delete(userId);
      setImmediate(() => triggerSimilarityUpdate(userId));
    }
  }
}

/**
 * One-time bootstrap: recalculate similarity for every user that has
 * at least one interaction. Runs sequentially to avoid overwhelming the
 * DB connection pool. Called from the admin bootstrap endpoint.
 *
 * @returns {{ users_processed: number, duration_ms: number }}
 */
async function bootstrapAllUsers() {
  const { rows } = await pool.query(
    `SELECT DISTINCT user_id FROM user_interactions ORDER BY user_id`,
  );

  const start = Date.now();
  let processed = 0;

  for (const { user_id } of rows) {
    try {
      await recalcSimilarityForUser(user_id);
      processed += 1;
    } catch (err) {
      console.error(`[similarity] bootstrap failed for user ${user_id}:`, err.message);
    }
  }

  return { users_processed: processed, duration_ms: Date.now() - start };
}

module.exports = {
  triggerSimilarityUpdate,
  bootstrapAllUsers,
};
