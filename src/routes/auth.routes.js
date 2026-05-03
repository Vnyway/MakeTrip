const express = require('express');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { register: registerUser, login: loginUser } = require('../services/auth.service');
const { signAuthToken } = require('../utils/jwt.util');
const { catchAsync } = require('../utils/async');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post(
  '/register',
  catchAsync(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const user = await registerUser(body);

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    return res.status(201).json({ token, user });
  }),
);

router.post(
  '/login',
  catchAsync(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const authUser = await loginUser(body);

    const token = signAuthToken({
      userId: authUser.userId,
      email: authUser.email,
      roles: authUser.roles,
    });

    return res.json({
      token,
      user: {
        id: authUser.userId,
        email: authUser.email,
        roles: authUser.roles,
      },
    });
  }),
);

router.get(
  '/me',
  authenticate(),
  catchAsync(async (req, res) =>
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles,
      },
    }),
  ),
);

module.exports = router;
