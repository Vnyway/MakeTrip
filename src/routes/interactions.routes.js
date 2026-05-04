const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../utils/async');
const { pool } = require('../config/db');
const { assertServiceExists, logInteraction } = require('../services/userInteractions.service');
const { interactionLogSchema } = require('../validators/userActivity.validator');

const router = express.Router();

router.post(
  '/',
  authenticate(),
  catchAsync(async (req, res) => {
    const body = interactionLogSchema.parse(req.body || {});

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await assertServiceExists(client, body.service_id);

      await logInteraction(client, {
        userId: req.user.id,
        serviceId: body.service_id,
        interactionType: body.interaction_type,
        weight: 1,
        meta: body.meta ?? null,
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return res.status(204).send();
  }),
);

module.exports = router;
