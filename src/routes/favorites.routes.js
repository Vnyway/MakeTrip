const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const favoritesService = require('../services/favorites.service');
const { triggerSimilarityUpdate } = require('../services/similarity.service');
const { favoriteBodySchema } = require('../validators/userActivity.validator');
const { uuidSchema } = require('../validators/services.validator');

const router = express.Router();

router.use(authenticate());

router.get(
  '/',
  catchAsync(async (req, res) => {
    const items = await favoritesService.listFavorites(req.user.id);
    return res.json({ items });
  }),
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const body = favoriteBodySchema.parse(req.body);
    const favorite = await favoritesService.addFavorite(req.user.id, body.service_id);
    setImmediate(() => triggerSimilarityUpdate(req.user.id));
    return res.status(201).json({ favorite });
  }),
);

router.delete(
  '/:serviceId',
  catchAsync(async (req, res) => {
    const serviceId = uuidSchema.parse(req.params.serviceId);
    await favoritesService.removeFavorite(req.user.id, serviceId);
    setImmediate(() => triggerSimilarityUpdate(req.user.id));
    return res.status(204).send();
  }),
);

module.exports = router;
