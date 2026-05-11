const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/db');
const { catchAsync } = require('../utils/async');

const router = express.Router();

const cityQuerySchema = z.object({
  country_id: z.coerce.number().int().positive().optional(),
});

router.get(
  '/countries',
  catchAsync(async (_req, res) => {
    const result = await pool.query(
      `SELECT id, iso_code, name
       FROM countries
       ORDER BY name ASC`,
    );
    return res.json({ items: result.rows });
  }),
);

router.get(
  '/cities',
  catchAsync(async (req, res) => {
    const query = cityQuerySchema.parse(req.query || {});
    const params = [];
    let whereSql = '';
    if (query.country_id) {
      params.push(query.country_id);
      whereSql = `WHERE country_id = $1`;
    }

    const result = await pool.query(
      `SELECT id, country_id, name
       FROM cities
       ${whereSql}
       ORDER BY name ASC`,
      params,
    );
    return res.json({ items: result.rows });
  }),
);

module.exports = router;

