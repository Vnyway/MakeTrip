const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
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

module.exports = router;

