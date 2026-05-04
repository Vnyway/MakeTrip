const { pool } = require('../config/db');

async function assertServiceExists(client, serviceId) {
  const result = await client.query('SELECT id FROM services WHERE id = $1', [serviceId]);

  if (!result.rowCount) {
    const err = new Error('Service not found.');
    err.status = 404;
    throw err;
  }
}

async function logInteraction(client, { userId, serviceId, interactionType, weight, meta }) {
  await client.query(
    `INSERT INTO user_interactions (user_id, service_id, interaction_type, weight, meta)
     VALUES ($1, $2, $3::interaction_type, $4, $5)`,
    [userId, serviceId, interactionType, weight ?? null, meta ?? null],
  );
}

async function logInteractionPool({ userId, serviceId, interactionType, weight, meta }) {
  await logInteraction(pool, { userId, serviceId, interactionType, weight, meta });
}

module.exports = {
  assertServiceExists,
  logInteraction,
  logInteractionPool,
};
