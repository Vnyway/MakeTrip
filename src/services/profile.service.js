const { pool } = require('../config/db');

const KNOWN_PREFERENCE_KEYS = [
  'preferred_kind',
  'preferred_activity_kind',
  'budget_max_usd',
  'vacation_type',
];

function fromRowsToPreferences(rows) {
  const base = {
    preferred_kind: null,
    preferred_activity_kind: null,
    budget_max_usd: null,
    vacation_type: null,
  };

  for (const row of rows) {
    if (!KNOWN_PREFERENCE_KEYS.includes(row.preference_key)) continue;
    if (row.preference_key === 'budget_max_usd') {
      base.budget_max_usd = Number(row.preference_value);
      continue;
    }
    base[row.preference_key] = row.preference_value;
  }

  return base;
}

async function getProfile(userId) {
  const [userResult, prefResult, summaryResult] = await Promise.all([
    pool.query(
      `SELECT u.id, u.email, u.status::text AS status, u.created_at
       FROM users u
       WHERE u.id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT preference_key, preference_value, weight
       FROM user_preferences
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM favorites f WHERE f.user_id = $1) AS favorites_count,
         (SELECT COUNT(*)::int FROM bookings b WHERE b.user_id = $1) AS bookings_count,
         (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = $1) AS reviews_count,
         (SELECT COUNT(*)::int FROM user_interactions ui WHERE ui.user_id = $1 AND ui.created_at >= now() - interval '30 days') AS interactions_last_30_days`,
      [userId],
    ),
  ]);

  const user = userResult.rows[0];
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  return {
    user,
    preferences: fromRowsToPreferences(prefResult.rows),
    activity_summary: summaryResult.rows[0],
  };
}

async function upsertPreferences(userId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const key of KNOWN_PREFERENCE_KEYS) {
      if (payload[key] === undefined) continue;
      const rawValue = payload[key];

      if (rawValue === null || rawValue === '') {
        await client.query(
          `DELETE FROM user_preferences WHERE user_id = $1 AND preference_key = $2`,
          [userId, key],
        );
        continue;
      }

      await client.query(
        `INSERT INTO user_preferences (user_id, preference_key, preference_value, weight)
         VALUES ($1, $2, $3, 1.000)
         ON CONFLICT (user_id, preference_key)
         DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = now()`,
        [userId, key, String(rawValue)],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const profile = await getProfile(userId);
  return profile.preferences;
}

module.exports = {
  getProfile,
  upsertPreferences,
};

