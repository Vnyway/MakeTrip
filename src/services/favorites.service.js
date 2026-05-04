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

async function listFavorites(userId) {
  const result = await pool.query(
    `SELECT
       f.service_id,
       f.created_at,
       s.id AS service_id_join,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS status,
       ${SERVICE_KIND_SELECT}
     FROM favorites f
     JOIN services s ON s.id = f.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants r ON r.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    service_id: row.service_id,
    created_at: row.created_at,
    service: {
      id: row.service_id_join,
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

async function addFavorite(userId, serviceId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertServiceExists(client, serviceId);

    await client.query(
      `INSERT INTO favorites (user_id, service_id) VALUES ($1, $2)`,
      [userId, serviceId],
    );

    await logInteraction(client, {
      userId,
      serviceId,
      interactionType: 'favorite_add',
      weight: 1,
      meta: null,
    });

    await client.query('COMMIT');

    return { user_id: userId, service_id: serviceId };
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Already in favorites.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function removeFavorite(userId, serviceId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleted = await client.query(
      `DELETE FROM favorites WHERE user_id = $1 AND service_id = $2 RETURNING service_id`,
      [userId, serviceId],
    );

    if (!deleted.rowCount) {
      const err = new Error('Favorite not found.');
      err.status = 404;
      throw err;
    }

    await logInteraction(client, {
      userId,
      serviceId,
      interactionType: 'favorite_remove',
      weight: 1,
      meta: null,
    });

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
