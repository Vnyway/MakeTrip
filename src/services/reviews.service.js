const { pool } = require('../config/db');
const { assertServiceExists, logInteraction } = require('./userInteractions.service');

const SERVICE_KIND_SELECT = `
  CASE
    WHEN h.service_id IS NOT NULL THEN 'hotel'
    WHEN rest.service_id IS NOT NULL THEN 'restaurant'
    WHEN fl.service_id IS NOT NULL THEN 'flight'
    WHEN a.service_id IS NOT NULL THEN 'activity'
  END AS kind
`;

async function listByService(serviceId) {
  const result = await pool.query(
    `SELECT rating, comment, created_at
     FROM reviews
     WHERE service_id = $1
     ORDER BY created_at DESC`,
    [serviceId],
  );

  return result.rows;
}

async function listMine(userId) {
  const result = await pool.query(
    `SELECT
       rev.id,
       rev.service_id,
       rev.rating,
       rev.comment,
       rev.created_at,
       rev.updated_at,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS status,
       ${SERVICE_KIND_SELECT}
     FROM reviews rev
     JOIN services s ON s.id = rev.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants rest ON rest.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE rev.user_id = $1
     ORDER BY rev.created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    service_id: row.service_id,
    rating: Number(row.rating),
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service: {
      id: row.service_id,
      title: row.title,
      description: row.description,
      country_id: row.country_id,
      city_id: row.city_id,
      price_usd: Number(row.price_usd),
      status: row.status,
      kind: row.kind,
    },
  }));
}

async function createReview(userId, { service_id, rating, comment }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertServiceExists(client, service_id);

    const inserted = await client.query(
      `INSERT INTO reviews (user_id, service_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, service_id, rating, comment, created_at, updated_at`,
      [userId, service_id, rating, comment ?? null],
    );

    const review = inserted.rows[0];

    await logInteraction(client, {
      userId,
      serviceId: service_id,
      interactionType: 'review',
      weight: rating,
      meta: { review_id: review.id },
    });

    await client.query('COMMIT');

    return review;
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Review already exists for this service. Use PATCH to update.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function updateReview(userId, serviceId, { rating, comment }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM reviews WHERE user_id = $1 AND service_id = $2 FOR UPDATE`,
      [userId, serviceId],
    );

    if (!existing.rowCount) {
      const err = new Error('Review not found.');
      err.status = 404;
      throw err;
    }

    const reviewId = existing.rows[0].id;

    const assignments = [];
    const params = [];
    let p = 1;

    if (rating !== undefined) {
      assignments.push(`rating = $${p}`);
      params.push(rating);
      p += 1;
    }

    if (comment !== undefined) {
      assignments.push(`comment = $${p}`);
      params.push(comment);
      p += 1;
    }

    assignments.push(`updated_at = now()`);

    await client.query(
      `UPDATE reviews SET ${assignments.join(', ')} WHERE id = $${p}`,
      [...params, reviewId],
    );

    const updated = await client.query(
      `SELECT id, user_id, service_id, rating, comment, created_at, updated_at
       FROM reviews WHERE id = $1`,
      [reviewId],
    );

    const review = updated.rows[0];

    await logInteraction(client, {
      userId,
      serviceId,
      interactionType: 'review',
      weight: rating ?? Number(review.rating),
      meta: { review_id: reviewId, action: 'update' },
    });

    await client.query('COMMIT');

    return review;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listByService,
  listMine,
  createReview,
  updateReview,
};
