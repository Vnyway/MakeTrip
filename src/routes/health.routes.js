const express = require('express');
const { pingDatabase } = require('../config/db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = await pingDatabase();

    return res.json({
      status: 'ok',
      db: 'connected',
      dbTime: db.db_time,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: error.message,
    });
  }
});

module.exports = router;
