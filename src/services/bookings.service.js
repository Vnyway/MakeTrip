const { pool } = require('../config/db');
const { assertServiceExists, logInteraction } = require('./userInteractions.service');

const SERVICE_KIND_SELECT = `
  CASE
    WHEN h.service_id IS NOT NULL THEN 'hotel'
    WHEN r.service_id IS NOT NULL THEN 'restaurant'
    WHEN fl.service_id IS NOT NULL THEN 'flight'
    WHEN a.service_id IS NOT NULL THEN 'activity'
  END AS kind
`;

function validateDateOrder(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const err = new Error('Invalid date format. Use YYYY-MM-DD.');
    err.status = 400;
    throw err;
  }

  if (end < start) {
    const err = new Error('end_date must be on or after start_date.');
    err.status = 400;
    throw err;
  }
}

async function listMine(userId) {
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
       b.updated_at,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS service_status,
       ${SERVICE_KIND_SELECT}
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants r ON r.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    service_id: row.service_id,
    start_date: row.start_date,
    end_date: row.end_date,
    persons_count: Number(row.persons_count),
    total_price_usd: Number(row.total_price_usd),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service: {
      id: row.service_id,
      title: row.title,
      description: row.description,
      country_id: row.country_id,
      city_id: row.city_id,
      price_usd: Number(row.price_usd),
      status: row.service_status,
      kind: row.kind,
    },
  }));
}

async function getById(userId, bookingId) {
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
       b.updated_at,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS service_status,
       ${SERVICE_KIND_SELECT}
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants r ON r.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE b.id = $1 AND b.user_id = $2`,
    [bookingId, userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    service_id: row.service_id,
    start_date: row.start_date,
    end_date: row.end_date,
    persons_count: Number(row.persons_count),
    total_price_usd: Number(row.total_price_usd),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service: {
      id: row.service_id,
      title: row.title,
      description: row.description,
      country_id: row.country_id,
      city_id: row.city_id,
      price_usd: Number(row.price_usd),
      status: row.service_status,
      kind: row.kind,
    },
  };
}

async function createBooking(userId, payload) {
  validateDateOrder(payload.start_date, payload.end_date);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertServiceExists(client, payload.service_id);

    const status = payload.status ?? 'pending';

    const inserted = await client.query(
      `INSERT INTO bookings
        (user_id, service_id, start_date, end_date, persons_count, total_price_usd, status)
       VALUES ($1, $2, $3::date, $4::date, $5, $6, $7::booking_status)
       RETURNING id, user_id, service_id, start_date, end_date, persons_count, total_price_usd, status::text AS status, created_at, updated_at`,
      [
        userId,
        payload.service_id,
        payload.start_date,
        payload.end_date,
        payload.persons_count,
        payload.total_price_usd,
        status,
      ],
    );

    const booking = inserted.rows[0];

    await logInteraction(client, {
      userId,
      serviceId: payload.service_id,
      interactionType: 'booking',
      weight: Number(booking.total_price_usd),
      meta: { booking_id: booking.id, status: booking.status },
    });

    await client.query('COMMIT');

    return booking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateStatus(userId, bookingId, status) {
  const result = await pool.query(
    `UPDATE bookings
     SET status = $1::booking_status, updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, service_id, start_date, end_date, persons_count, total_price_usd, status::text AS status, created_at, updated_at`,
    [status, bookingId, userId],
  );

  const booking = result.rows[0];
  if (!booking) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  return booking;
}

module.exports = {
  listMine,
  getById,
  createBooking,
  updateStatus,
};
