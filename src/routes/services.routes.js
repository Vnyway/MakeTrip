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
const { mediaPresignSchema, mediaRegisterSchema } = require('../validators/media.validator');

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await catalogService.listServices(query);
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

module.exports = router;
