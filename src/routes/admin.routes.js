const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/roles.middleware');

const router = express.Router();

router.get('/ping', authenticate(), requireRoles('admin'), (_req, res) =>
  res.json({ ok: true, audience: 'admin' }),
);

module.exports = router;
