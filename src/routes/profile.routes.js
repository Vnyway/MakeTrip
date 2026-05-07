const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const { profilePreferencesSchema } = require('../validators/profile.validator');
const profileService = require('../services/profile.service');

const router = express.Router();

router.use(authenticate());

router.get(
  '/',
  catchAsync(async (req, res) => {
    const profile = await profileService.getProfile(req.user.id);
    return res.json(profile);
  }),
);

router.put(
  '/preferences',
  catchAsync(async (req, res) => {
    const payload = profilePreferencesSchema.parse(req.body || {});
    const preferences = await profileService.upsertPreferences(req.user.id, payload);
    return res.json({ preferences });
  }),
);

module.exports = router;

