const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { catchAsync } = require('../utils/async');
const { pool } = require('../config/db');
const { uuidSchema } = require('../validators/services.validator');
const { bookingPatchSchema } = require('../validators/userActivity.validator');
const { bootstrapAllUsers } = require('../services/similarity.service');

const router = express.Router();

router.use(authenticate(), requireRoles('admin'));

router.get('/ping', (_req, res) => res.json({ ok: true, audience: 'admin' }));

router.get(
  '/dashboard',
  catchAsync(async (_req, res) => {
    const [kpiResult, trendResult, kindsResult] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM services) AS services_count,
           (SELECT COUNT(*)::int FROM bookings) AS bookings_count,
           (SELECT COUNT(*)::int FROM reviews) AS reviews_count,
           (SELECT COUNT(DISTINCT user_id)::int FROM user_interactions WHERE created_at >= now() - interval '30 days') AS active_users_30d`,
      ),
      pool.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM bookings
         WHERE created_at >= now() - interval '7 days'
         GROUP BY 1
         ORDER BY 1 ASC`,
      ),
      pool.query(
        `SELECT kind, COUNT(*)::int AS count
         FROM (
           SELECT
             CASE
               WHEN h.service_id IS NOT NULL THEN 'hotel'
               WHEN r.service_id IS NOT NULL THEN 'restaurant'
               WHEN f.service_id IS NOT NULL THEN 'flight'
               WHEN a.service_id IS NOT NULL THEN 'activity'
             END AS kind
           FROM services s
           LEFT JOIN hotels h ON h.service_id = s.id
           LEFT JOIN restaurants r ON r.service_id = s.id
           LEFT JOIN flights f ON f.service_id = s.id
           LEFT JOIN activities a ON a.service_id = s.id
         ) kinds
         WHERE kind IS NOT NULL
         GROUP BY kind
         ORDER BY kind`,
      ),
    ]);

    return res.json({
      kpis: kpiResult.rows[0],
      charts: {
        bookings_trend_7d: trendResult.rows,
        services_by_kind: kindsResult.rows,
      },
    });
  }),
);

router.get(
  '/bookings',
  catchAsync(async (_req, res) => {
    const result = await pool.query(
      `SELECT
         b.id,
         b.user_id,
         b.service_id,
         b.start_date,
         b.end_date,
         b.persons_count,
         b.total_price_usd,
         b.status::text AS status,
         b.created_at,
         u.email AS user_email,
         s.title AS service_title
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN services s ON s.id = b.service_id
       ORDER BY b.created_at DESC
       LIMIT 300`,
    );
    return res.json({ items: result.rows });
  }),
);

router.patch(
  '/bookings/:bookingId',
  catchAsync(async (req, res) => {
    const bookingId = uuidSchema.parse(req.params.bookingId);
    const body = bookingPatchSchema.parse(req.body || {});
    const result = await pool.query(
      `UPDATE bookings
       SET status = $1::booking_status, updated_at = now()
       WHERE id = $2
       RETURNING id, user_id, service_id, start_date, end_date, persons_count, total_price_usd, status::text AS status, created_at, updated_at`,
      [body.status, bookingId],
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    return res.json({ booking: result.rows[0] });
  }),
);

router.get(
  '/reviews',
  catchAsync(async (_req, res) => {
    const result = await pool.query(
      `SELECT
         r.id,
         r.user_id,
         r.service_id,
         r.rating,
         r.comment,
         r.created_at,
         u.email AS user_email,
         s.title AS service_title
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN services s ON s.id = r.service_id
       ORDER BY r.created_at DESC
       LIMIT 300`,
    );
    return res.json({ items: result.rows });
  }),
);

router.post(
  '/jobs/bootstrap-similarity',
  catchAsync(async (_req, res) => {
    const result = await bootstrapAllUsers();
    return res.json({ ok: true, ...result });
  }),
);

router.delete(
  '/reviews/:reviewId',
  catchAsync(async (req, res) => {
    const reviewId = uuidSchema.parse(req.params.reviewId);
    const result = await pool.query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [reviewId]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    return res.status(204).send();
  }),
);

module.exports = router;
