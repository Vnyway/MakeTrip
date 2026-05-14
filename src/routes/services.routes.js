const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { catchAsync } = require('../utils/async');
const catalogService = require('../services/catalog.service');
const serviceMediaService = require('../services/serviceMedia.service');
const s3PresignService = require('../services/s3Presign.service');
const {
  catalogCreateSchema,
  buildCatalogPatchSchema,
  listQuerySchema,
  uuidSchema,
} = require('../validators/services.validator');
const { z } = require('zod');
const { pool } = require('../config/db');
const { mediaPresignSchema, mediaRegisterSchema } = require('../validators/media.validator');

const router = express.Router();

router.get(
  '/',
  authenticate(),
  catchAsync(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await catalogService.listServices(query, req.user.id);
    res.json(result);
  }),
);

router.get(
  '/:serviceId/media',
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);

    await serviceMediaService.assertServiceExists(serviceId);
    const items = await serviceMediaService.listMedia(serviceId);

    return res.json({ items });
  }),
);

router.post(
  '/:serviceId/media/presign',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);

    await serviceMediaService.assertServiceExists(serviceId);
    const body = mediaPresignSchema.parse(req.body || {});

    const payload = await s3PresignService.presignPutForServiceImage({
      serviceId,
      contentType: body.content_type,
    });

    return res.status(201).json(payload);
  }),
);

router.post(
  '/:serviceId/media',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    const body = mediaRegisterSchema.parse(req.body || {});

    const media = await serviceMediaService.registerMedia({
      serviceId,
      key: body.key,
      mediaType: body.media_type,
      sortOrder: body.sort_order,
    });

    return res.status(201).json({ media });
  }),
);

router.get(
  '/:serviceId/media/:mediaId/read',
  authenticate(),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    const mediaId = uuidSchema.parse(req.params.mediaId);

    const row = await serviceMediaService.getMediaRow(serviceId, mediaId);
    if (!row) {
      return res.status(404).json({ message: 'Media not found.' });
    }

    const key = s3PresignService.objectKeyFromStoredUrl(row.s3_url);
    const signed = await s3PresignService.presignGetObject({ key });

    return res.json({
      media_id: row.id,
      download_url: signed.download_url,
      expires_in_seconds: signed.expires_in_seconds,
    });
  }),
);

router.get(
  '/:serviceId',
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);

    const service = await catalogService.getServiceById(serviceId);

    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    return res.json({ service });
  }),
);

router.post(
  '/',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const payload = catalogCreateSchema.parse(req.body);

    const service = await catalogService.createService(payload);

    return res.status(201).json({ service });
  }),
);

router.patch(
  '/:serviceId',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);

    const kind = await catalogService.fetchKindOnly(serviceId);
    if (!kind) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    const schema = buildCatalogPatchSchema(kind).strict();
    const body = schema.parse(req.body || {});

    const service = await catalogService.patchService(serviceId, body, kind);

    return res.json({ service });
  }),
);

router.delete(
  '/:serviceId',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);

    const deleted = await catalogService.deleteService(serviceId);
    if (!deleted) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    return res.status(204).send();
  }),
);

const serviceTagsBodySchema = z.object({
  slugs: z.array(z.string().min(1).max(50)).max(16).default([]),
});

router.put(
  '/:serviceId/tags',
  authenticate(),
  requireRoles('admin'),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    const { slugs } = serviceTagsBodySchema.parse(req.body || {});

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM service_tags WHERE service_id = $1`, [serviceId]);

      if (slugs.length) {
        const tagRows = await client.query(
          `SELECT id, slug FROM tags WHERE slug = ANY($1::varchar[])`,
          [slugs],
        );

        for (const tag of tagRows.rows) {
          await client.query(
            `INSERT INTO service_tags (service_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [serviceId, tag.id],
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      `SELECT t.slug FROM service_tags st JOIN tags t ON t.id = st.tag_id WHERE st.service_id = $1 ORDER BY t.slug`,
      [serviceId],
    );

    return res.json({ tags: rows.map((r) => r.slug) });
  }),
);

module.exports = router;
