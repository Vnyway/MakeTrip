const { pool } = require('../config/db');
const {
  buildPublicObjectUrl,
  assertObjectExists,
  assertAwsConfigured,
} = require('./s3Presign.service');

function assertServiceScopedObjectKey(serviceId, key) {
  if (!key || typeof key !== 'string') {
    const err = new Error('Invalid object key.');
    err.status = 400;
    throw err;
  }

  if (key.includes('..')) {
    const err = new Error('Invalid object key.');
    err.status = 400;
    throw err;
  }

  const prefix = `services/${serviceId}/`;
  if (!key.startsWith(prefix)) {
    const err = new Error('Object key must be scoped to this service.');
    err.status = 400;
    throw err;
  }

  const remainder = key.slice(prefix.length);
  if (!remainder || remainder.includes('/')) {
    const err = new Error('Invalid object key shape.');
    err.status = 400;
    throw err;
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(remainder)) {
    const err = new Error('Invalid object key characters.');
    err.status = 400;
    throw err;
  }
}

async function assertServiceExists(serviceId) {
  const result = await pool.query('SELECT id FROM services WHERE id = $1', [serviceId]);
  if (!result.rowCount) {
    const err = new Error('Service not found.');
    err.status = 404;
    throw err;
  }
}

async function listMedia(serviceId) {
  const result = await pool.query(
    `SELECT id, service_id, media_type, s3_url, sort_order
     FROM service_media
     WHERE service_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [serviceId],
  );

  return result.rows;
}

async function getMediaRow(serviceId, mediaId) {
  const result = await pool.query(
    `SELECT id, service_id, media_type, s3_url, sort_order
     FROM service_media
     WHERE id = $1 AND service_id = $2`,
    [mediaId, serviceId],
  );

  return result.rows[0] || null;
}

async function registerMedia({ serviceId, key, mediaType, sortOrder }) {
  await assertServiceExists(serviceId);
  assertServiceScopedObjectKey(serviceId, key);

  await assertObjectExists({ key });

  const cfg = assertAwsConfigured();
  const s3_url = buildPublicObjectUrl(cfg.bucket, cfg.region, key);

  const inserted = await pool.query(
    `INSERT INTO service_media (service_id, media_type, s3_url, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, service_id, media_type, s3_url, sort_order`,
    [serviceId, mediaType, s3_url, sortOrder ?? 0],
  );

  return inserted.rows[0];
}

module.exports = {
  listMedia,
  getMediaRow,
  registerMedia,
  assertServiceExists,
};
