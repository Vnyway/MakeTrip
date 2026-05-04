const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');
const { catchAsync } = require('../utils/async');
const catalogService = require('../services/catalog.service');
const {
  catalogCreateSchema,
  buildCatalogPatchSchema,
  listQuerySchema,
  uuidSchema,
} = require('../validators/services.validator');

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
