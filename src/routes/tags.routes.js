const express = require('express');
const { catchAsync } = require('../utils/async');
const { pool } = require('../config/db');

const router = express.Router();

router.get(
  '/',
  catchAsync(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, slug, label FROM tags ORDER BY label ASC`,
    );
    return res.json({ items: rows });
  }),
);

module.exports = router;
