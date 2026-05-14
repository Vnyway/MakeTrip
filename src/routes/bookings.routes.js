const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const bookingsService = require('../services/bookings.service');
const { triggerSimilarityUpdate } = require('../services/similarity.service');
const { bookingCreateSchema, bookingPatchSchema } = require('../validators/userActivity.validator');
const { uuidSchema } = require('../validators/services.validator');

const router = express.Router();

router.use(authenticate());

router.get(
  '/mine',
  catchAsync(async (req, res) => {
    const items = await bookingsService.listMine(req.user.id);
    return res.json({ items });
  }),
);

router.get(
  '/:bookingId',
  catchAsync(async (req, res) => {
    const bookingId = uuidSchema.parse(req.params.bookingId);
    const booking = await bookingsService.getById(req.user.id, bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    return res.json({ booking });
  }),
);

router.post(
  '/',
  catchAsync(async (req, res) => {
    const body = bookingCreateSchema.parse(req.body);
    const booking = await bookingsService.createBooking(req.user.id, body);
    setImmediate(() => triggerSimilarityUpdate(req.user.id));
    return res.status(201).json({ booking });
  }),
);

router.patch(
  '/:bookingId',
  catchAsync(async (req, res) => {
    const bookingId = uuidSchema.parse(req.params.bookingId);
    const body = bookingPatchSchema.parse(req.body || {});

    const booking = await bookingsService.updateStatus(req.user.id, bookingId, body.status);
    return res.json({ booking });
  }),
);

module.exports = router;
