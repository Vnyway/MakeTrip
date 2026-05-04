const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const reviewsService = require('../services/reviews.service');
const { assertServiceExists } = require('../services/userInteractions.service');
const { pool } = require('../config/db');
const {
  reviewCreateSchema,
  reviewPatchSchema,
} = require('../validators/userActivity.validator');
const { uuidSchema } = require('../validators/services.validator');

const router = express.Router();

router.get(
  '/by-service/:serviceId',
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    await assertServiceExists(pool, serviceId);

    const items = await reviewsService.listByService(serviceId);
    return res.json({ items });
  }),
);

router.get(
  '/mine',
  authenticate(),
  catchAsync(async (req, res) => {
    const items = await reviewsService.listMine(req.user.id);
    return res.json({ items });
  }),
);

router.post(
  '/',
  authenticate(),
  catchAsync(async (req, res) => {
    const body = reviewCreateSchema.parse(req.body);
    const review = await reviewsService.createReview(req.user.id, body);
    return res.status(201).json({ review });
  }),
);

router.patch(
  '/:serviceId',
  authenticate(),
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    const body = reviewPatchSchema.parse(req.body || {});

    const review = await reviewsService.updateReview(req.user.id, serviceId, body);
    return res.json({ review });
  }),
);

module.exports = router;
