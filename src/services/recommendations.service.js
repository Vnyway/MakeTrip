const { pool } = require('../config/db');
const { mapServiceRow } = require('./catalog.service');

const MODEL_VERSION = 'v1-hybrid';

const WEIGHTS = {
  alpha_cf: 0.5,
  beta_cb: 0.35,
  gamma_pop: 0.15,
};

const INTERACTION_WEIGHT_SQL = `
  CASE ui.interaction_type
    WHEN 'view' THEN 0.08
    WHEN 'click' THEN 0.15
    WHEN 'favorite_add' THEN 1.0
    WHEN 'favorite_remove' THEN -0.35
    WHEN 'booking' THEN 2.5
    WHEN 'review' THEN LEAST(2.5, GREATEST(0.15, COALESCE(ui.weight, 3)::float8 / 5.0 * 2.0))
    ELSE 0
  END
`;

function buildCandidateWhere(filters) {
  const {
    kind,
    country_id,
    city_id,
    min_price_usd,
    max_price_usd,
    status,
    cuisine,
    activity_kind,
    origin_city_id,
    destination_city_id,
    q,
  } = filters;

  const clause = [`1 = 1`];
  const params = [];
  let i = 1;

  clause.push(`
    CASE
      WHEN h.service_id IS NOT NULL THEN 'hotel'
      WHEN r.service_id IS NOT NULL THEN 'restaurant'
      WHEN f.service_id IS NOT NULL THEN 'flight'
      WHEN a.service_id IS NOT NULL THEN 'activity'
    END IS NOT NULL
  `);

  if (status) {
    clause.push(`s.status = $${i}::service_status`);
    params.push(status);
    i += 1;
  } else {
    clause.push(`s.status = 'active'`);
  }

  if (kind) {
    clause.push(`
      CASE
        WHEN h.service_id IS NOT NULL THEN 'hotel'
        WHEN r.service_id IS NOT NULL THEN 'restaurant'
        WHEN f.service_id IS NOT NULL THEN 'flight'
        WHEN a.service_id IS NOT NULL THEN 'activity'
      END = $${i}
    `);
    params.push(kind);
    i += 1;
  }

  if (country_id != null) {
    clause.push(`s.country_id = $${i}`);
    params.push(country_id);
    i += 1;
  }

  if (city_id != null) {
    clause.push(`s.city_id = $${i}`);
    params.push(city_id);
    i += 1;
  }

  if (min_price_usd != null) {
    clause.push(`s.price_usd >= $${i}`);
    params.push(min_price_usd);
    i += 1;
  }

  if (max_price_usd != null) {
    clause.push(`s.price_usd <= $${i}`);
    params.push(max_price_usd);
    i += 1;
  }

  if (cuisine != null && cuisine !== '') {
    clause.push(`r.cuisine ILIKE $${i}`);
    params.push(`%${cuisine}%`);
    i += 1;
  }

  if (activity_kind != null && activity_kind !== '') {
    clause.push(`a.activity_kind ILIKE $${i}`);
    params.push(`%${activity_kind}%`);
    i += 1;
  }

  if (origin_city_id != null) {
    clause.push(`f.origin_city_id = $${i}`);
    params.push(origin_city_id);
    i += 1;
  }

  if (destination_city_id != null) {
    clause.push(`f.destination_city_id = $${i}`);
    params.push(destination_city_id);
    i += 1;
  }

  if (q) {
    clause.push(`s.search_vector @@ plainto_tsquery('english', $${i})`);
    params.push(q);
    i += 1;
  }

  return { whereSql: clause.join('\n AND '), params, nextIndex: i };
}

function normalizeScores(rawById) {
  const values = Object.values(rawById).filter((v) => Number.isFinite(v) && v > 0);
  const max = Math.max(...values, 0);

  if (!max) {
    return Object.fromEntries(Object.keys(rawById).map((id) => [id, 0]));
  }

  return Object.fromEntries(
    Object.entries(rawById).map(([id, v]) => [id, Math.max(0, Number(v) || 0) / max]),
  );
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Content-based boost using implicit tag preferences derived from behavior.
 * @param {string[]} serviceTags - slugs attached to the candidate service
 * @param {Record<string, number>} userTagWeights - slug → accumulated weight from user's interactions
 * @returns {number} score in [0, 1]
 */
function contentBoost(serviceTags, userTagWeights) {
  const BASE = 0.38;

  if (!serviceTags.length || !Object.keys(userTagWeights).length) return BASE;

  const totalUserWeight = Object.values(userTagWeights).reduce((a, b) => a + b, 0);
  if (!totalUserWeight) return BASE;

  let matchedWeight = 0;
  for (const tag of serviceTags) {
    if (userTagWeights[tag] > 0) {
      matchedWeight += userTagWeights[tag];
    }
  }

  const matchRatio = Math.min(1, matchedWeight / totalUserWeight);
  return clamp01(BASE + 0.52 * matchRatio);
}

async function fetchCandidates(filters) {
  const { whereSql, params, nextIndex } = buildCandidateWhere(filters);
  const limit = filters.candidate_limit;

  const limitParam = `$${nextIndex}`;
  const candidateSql = `
    SELECT
      s.id,
      s.title,
      s.description,
      s.country_id,
      s.city_id,
      s.price_usd,
      s.status::text AS status,
      s.created_at,
      s.updated_at,
      CASE
        WHEN h.service_id IS NOT NULL THEN 'hotel'
        WHEN r.service_id IS NOT NULL THEN 'restaurant'
        WHEN f.service_id IS NOT NULL THEN 'flight'
        WHEN a.service_id IS NOT NULL THEN 'activity'
      END AS kind,
      h.stars AS hotel_stars,
      h.address AS hotel_address,
      r.cuisine AS restaurant_cuisine,
      f.origin_city_id AS flight_origin_city_id,
      f.destination_city_id AS flight_destination_city_id,
      f.airline AS flight_airline,
      f.depart_at AS flight_depart_at,
      f.arrive_at AS flight_arrive_at,
      a.activity_kind AS activity_kind,
      a.duration_minutes AS activity_duration_minutes,
      ARRAY(SELECT t.slug FROM service_tags st JOIN tags t ON t.id = st.tag_id WHERE st.service_id = s.id ORDER BY t.slug) AS tags
    FROM services s
    LEFT JOIN hotels h ON h.service_id = s.id
    LEFT JOIN restaurants r ON r.service_id = s.id
    LEFT JOIN flights f ON f.service_id = s.id
    LEFT JOIN activities a ON a.service_id = s.id
    WHERE ${whereSql}
    ORDER BY random()
    LIMIT ${limitParam}
  `;

  const result = await pool.query(candidateSql, [...params, limit]);
  return result.rows.map((row) => ({
    row,
    service: mapServiceRow(row),
  }));
}

/**
 * Infer tag preferences implicitly from user's interaction history.
 * Returns a map of tag slug → accumulated interaction weight.
 */
async function inferTagPrefs(userId) {
  const result = await pool.query(
    `SELECT
       t.slug,
       SUM(
         CASE ui.interaction_type
           WHEN 'view'            THEN 0.08
           WHEN 'click'           THEN 0.15
           WHEN 'favorite_add'    THEN 1.0
           WHEN 'favorite_remove' THEN -0.35
           WHEN 'booking'         THEN 2.5
           WHEN 'review'          THEN 1.5
           ELSE 0
         END
       )::float8 AS weight
     FROM user_interactions ui
     JOIN service_tags st ON st.service_id = ui.service_id
     JOIN tags t ON t.id = st.tag_id
     WHERE ui.user_id = $1
     GROUP BY t.slug
     HAVING SUM(
       CASE ui.interaction_type
         WHEN 'view'            THEN 0.08
         WHEN 'click'           THEN 0.15
         WHEN 'favorite_add'    THEN 1.0
         WHEN 'favorite_remove' THEN -0.35
         WHEN 'booking'         THEN 2.5
         WHEN 'review'          THEN 1.5
         ELSE 0
       END
     ) > 0
     ORDER BY weight DESC
     LIMIT 10`,
    [userId],
  );

  return Object.fromEntries(result.rows.map((r) => [r.slug, Number(r.weight)]));
}

async function loadCollaborativeScores(userId, serviceIds) {
  if (!serviceIds.length) {
    return {};
  }

  const result = await pool.query(
    `SELECT
       ui.service_id,
       SUM(us.score * (${INTERACTION_WEIGHT_SQL}))::float8 AS cf_raw
     FROM user_interactions ui
     JOIN user_similarity us ON us.similar_user_id = ui.user_id
     WHERE us.user_id = $1
       AND ui.service_id = ANY($2::uuid[])
     GROUP BY ui.service_id`,
    [userId, serviceIds],
  );

  return Object.fromEntries(result.rows.map((r) => [r.service_id, Number(r.cf_raw) || 0]));
}

async function loadReviewStats(serviceIds) {
  if (!serviceIds.length) {
    return {};
  }

  const result = await pool.query(
    `SELECT service_id, AVG(rating)::float8 AS avg_rating, COUNT(*)::int AS review_count
     FROM reviews
     WHERE service_id = ANY($1::uuid[])
     GROUP BY service_id`,
    [serviceIds],
  );

  return Object.fromEntries(
    result.rows.map((r) => [
      r.service_id,
      { avg_rating: Number(r.avg_rating) || 0, review_count: Number(r.review_count) || 0 },
    ]),
  );
}

async function loadInteractionTraffic(serviceIds) {
  if (!serviceIds.length) {
    return {};
  }

  const result = await pool.query(
    `SELECT
       service_id,
       COUNT(*) FILTER (WHERE interaction_type = 'view')::float8 AS views,
       COUNT(*) FILTER (WHERE interaction_type = 'click')::float8 AS clicks,
       COUNT(*) FILTER (WHERE interaction_type = 'favorite_add')::float8 AS favorites,
       COUNT(*) FILTER (WHERE interaction_type = 'booking')::float8 AS bookings
     FROM user_interactions
     WHERE service_id = ANY($1::uuid[])
     GROUP BY service_id`,
    [serviceIds],
  );

  return Object.fromEntries(
    result.rows.map((r) => [
      r.service_id,
      {
        views: Number(r.views) || 0,
        clicks: Number(r.clicks) || 0,
        favorites: Number(r.favorites) || 0,
        bookings: Number(r.bookings) || 0,
      },
    ]),
  );
}

async function loadSelfIntensity(userId, serviceIds) {
  if (!serviceIds.length) {
    return {};
  }

  const result = await pool.query(
    `SELECT
       service_id,
       SUM(
         CASE interaction_type
           WHEN 'view' THEN 0.05
           WHEN 'click' THEN 0.08
           WHEN 'favorite_add' THEN 0.35
           WHEN 'favorite_remove' THEN -0.1
           WHEN 'booking' THEN 0.65
           WHEN 'review' THEN 0.3
           ELSE 0
         END
       )::float8 AS own_intensity
     FROM user_interactions
     WHERE user_id = $1
       AND service_id = ANY($2::uuid[])
     GROUP BY service_id`,
    [userId, serviceIds],
  );

  return Object.fromEntries(result.rows.map((r) => [r.service_id, Number(r.own_intensity) || 0]));
}

function popularityRaw(serviceId, reviewStats, trafficStats) {
  const reviews = reviewStats[serviceId] || { avg_rating: 0, review_count: 0 };
  const traffic = trafficStats[serviceId] || { views: 0, clicks: 0, favorites: 0, bookings: 0 };

  const ratingPart =
    reviews.review_count > 0 ? clamp01((reviews.avg_rating || 0) / 5) : 0.35;

  const engagement =
    traffic.views +
    1.4 * traffic.clicks +
    2.2 * traffic.favorites +
    3.5 * traffic.bookings;

  const trafficPart = clamp01(Math.log(1 + engagement) / Math.log(1 + 180));

  return clamp01(0.58 * ratingPart + 0.42 * trafficPart);
}

async function persistRecommendations(userId, rows) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM recommendations WHERE user_id = $1 AND model_version = $2`, [
      userId,
      MODEL_VERSION,
    ]);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const row of rows) {
      await client.query(
        `INSERT INTO recommendations (user_id, service_id, score, reason, model_version, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, row.service_id, row.score, row.reason, MODEL_VERSION, expiresAt.toISOString()],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getRecommendations(userId, filters) {
  const { limit, candidate_limit, persist, ...catalogFilters } = filters;

  const candidates = await fetchCandidates({ ...catalogFilters, candidate_limit });
  const serviceIds = candidates.map((c) => c.service.id);

  if (!serviceIds.length) {
    return {
      recommendations: [],
      meta: {
        model_version: MODEL_VERSION,
        weights: WEIGHTS,
        candidate_count: 0,
        persisted: false,
      },
    };
  }

  const [tagWeights, cfRaw, reviewStats, trafficStats, selfIntensity] = await Promise.all([
    inferTagPrefs(userId),
    loadCollaborativeScores(userId, serviceIds),
    loadReviewStats(serviceIds),
    loadInteractionTraffic(serviceIds),
    loadSelfIntensity(userId, serviceIds),
  ]);

  const cfNorm = normalizeScores(cfRaw);

  const popRaw = Object.fromEntries(
    serviceIds.map((id) => [id, popularityRaw(id, reviewStats, trafficStats)]),
  );

  const popNorm = normalizeScores(popRaw);

  const scored = candidates.map(({ service }) => {
    const id = service.id;

    const cf = cfNorm[id] || 0;
    const pop = popNorm[id] || 0;
    const cb = contentBoost(service.tags || [], tagWeights);

    const self = selfIntensity[id] || 0;
    const selfPenalty = Math.min(0.28, Math.max(0, self) * 0.12);

    const score = clamp01(
      WEIGHTS.alpha_cf * cf +
        WEIGHTS.beta_cb * cb +
        WEIGHTS.gamma_pop * pop -
        selfPenalty,
    );

    const reason = [
      `cf=${cf.toFixed(3)}`,
      `cb=${cb.toFixed(3)}`,
      `pop=${pop.toFixed(3)}`,
      `self=-${selfPenalty.toFixed(3)}`,
    ].join(';');

    return {
      service_id: id,
      score,
      reason,
      components: {
        cf,
        cb,
        pop,
        self_penalty: selfPenalty,
      },
      service,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommendations = scored.slice(0, limit);

  if (persist && recommendations.length) {
    await persistRecommendations(userId, recommendations);
  }

  return {
    recommendations,
    meta: {
      model_version: MODEL_VERSION,
      weights: WEIGHTS,
      candidate_count: candidates.length,
      persisted: Boolean(persist && recommendations.length),
    },
  };
}

module.exports = {
  getRecommendations,
  MODEL_VERSION,
};
