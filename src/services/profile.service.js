const { pool } = require('../config/db');

async function getProfile(userId) {
  const [userResult, summaryResult] = await Promise.all([
    pool.query(
      `SELECT u.id, u.email, u.status::text AS status, u.created_at
       FROM users u
       WHERE u.id = $1`,
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
    activity_summary: summaryResult.rows[0],
  };
}

module.exports = {
  getProfile,
};

