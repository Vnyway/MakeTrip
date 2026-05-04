const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const { recommendationQuerySchema } = require('../validators/recommendations.validator');
const recommendationsService = require('../services/recommendations.service');

const router = express.Router();

router.use(authenticate());

router.get(
  '/',
  catchAsync(async (req, res) => {
    const query = recommendationQuerySchema.parse(req.query);
    const payload = await recommendationsService.getRecommendations(req.user.id, query);
    return res.json(payload);
  }),
);

module.exports = router;
