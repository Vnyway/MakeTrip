const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const toursService = require('../services/tours.service');
const {
  uuidSchema,
  tourCreateSchema,
  tourPatchSchema,
  tourItemCreateSchema,
  tourItemPatchSchema,
} = require('../validators/tours.validator');

const router = express.Router();

router.use(authenticate());

router.get(
  '/',
  catchAsync(async (req, res) => {
    const tours = await toursService.listTours(req.user.id);
    return res.json({ tours });
  }),
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const body = tourCreateSchema.parse(req.body || {});
    const tour = await toursService.createTour(req.user.id, body);
    return res.status(201).json({ tour });
  }),
);

router.get(
  '/:tourId/items',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const data = await toursService.getTourWithItems(req.user.id, tourId);
    return res.json({ items: data.items });
  }),
);

router.post(
  '/:tourId/items',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const body = tourItemCreateSchema.parse(req.body || {});

    const item = await toursService.addTourItem(req.user.id, tourId, body);
    return res.status(201).json({ item });
  }),
);

router.patch(
  '/:tourId/items/:itemId',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const itemId = uuidSchema.parse(req.params.itemId);
    const body = tourItemPatchSchema.parse(req.body || {});

    const item = await toursService.updateTourItem(req.user.id, tourId, itemId, body);
    return res.json({ item });
  }),
);

router.delete(
  '/:tourId/items/:itemId',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const itemId = uuidSchema.parse(req.params.itemId);

    const deleted = await toursService.deleteTourItem(req.user.id, tourId, itemId);
    if (!deleted) {
      return res.status(404).json({ message: 'Tour item not found.' });
    }

    return res.status(204).send();
  }),
);

router.get(
  '/:tourId',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const data = await toursService.getTourWithItems(req.user.id, tourId);
    return res.json(data);
  }),
);

router.patch(
  '/:tourId',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);
    const body = tourPatchSchema.parse(req.body || {});

    const tour = await toursService.updateTour(req.user.id, tourId, body);
    return res.json({ tour });
  }),
);

router.delete(
  '/:tourId',
  catchAsync(async (req, res) => {
    const tourId = uuidSchema.parse(req.params.tourId);

    const deleted = await toursService.deleteTour(req.user.id, tourId);
    if (!deleted) {
      return res.status(404).json({ message: 'Tour not found.' });
    }

    return res.status(204).send();
  }),
);

module.exports = router;
