const { pool } = require('../config/db');

function mapServiceRow(row) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    country_id: row.country_id,
    city_id: row.city_id,
    price_usd: Number(row.price_usd),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    kind: row.kind,
  };

  if (base.kind === 'hotel') {
    return {
      ...base,
      hotel: {
        stars: row.hotel_stars != null ? Number(row.hotel_stars) : null,
        address: row.hotel_address,
      },
    };
  }

  if (base.kind === 'restaurant') {
    return {
      ...base,
      restaurant: {
        cuisine: row.restaurant_cuisine,
      },
    };
  }

  if (base.kind === 'flight') {
    return {
      ...base,
      flight: {
        origin_city_id:
          row.flight_origin_city_id != null ? Number(row.flight_origin_city_id) : null,
        destination_city_id:
          row.flight_destination_city_id != null
            ? Number(row.flight_destination_city_id)
            : null,
        airline: row.flight_airline,
        depart_at: row.flight_depart_at,
        arrive_at: row.flight_arrive_at,
      },
    };
  }

  if (base.kind === 'activity') {
    return {
      ...base,
      activity: {
        activity_kind: row.activity_kind,
        duration_minutes:
          row.activity_duration_minutes != null
            ? Number(row.activity_duration_minutes)
            : null,
      },
    };
  }

  return base;
}

const SORT_EXPR = {
  'price_usd asc': 's.price_usd ASC NULLS LAST',
  'price_usd desc': 's.price_usd DESC NULLS LAST',
  'created_at asc': 's.created_at ASC NULLS LAST',
  'created_at desc': 's.created_at DESC NULLS LAST',
};

function validateFlightEndpoints(origin_city_id, destination_city_id) {
  if (
    origin_city_id != null &&
    destination_city_id != null &&
    Number(origin_city_id) === Number(destination_city_id)
  ) {
    const err = new Error('origin_city_id and destination_city_id must differ.');
    err.status = 400;
    throw err;
  }
}

async function listServices(filters) {
  const {
    kind,
    country_id,
    city_id,
    min_price_usd,
    max_price_usd,
    status,
    cuisine,
    activity_kind,
    origin_city_id,
    destination_city_id,
    q,
    page,
    limit,
    sort,
  } = filters;

  const clause = [`1 = 1`];
  const params = [];
  let i = 1;

  clause.push(`
    CASE
      WHEN h.service_id IS NOT NULL THEN 'hotel'
      WHEN r.service_id IS NOT NULL THEN 'restaurant'
      WHEN f.service_id IS NOT NULL THEN 'flight'
      WHEN a.service_id IS NOT NULL THEN 'activity'
    END IS NOT NULL
  `);

  if (kind) {
    clause.push(`
      CASE
        WHEN h.service_id IS NOT NULL THEN 'hotel'
        WHEN r.service_id IS NOT NULL THEN 'restaurant'
        WHEN f.service_id IS NOT NULL THEN 'flight'
        WHEN a.service_id IS NOT NULL THEN 'activity'
      END = $${i}
    `);
    params.push(kind);
    i += 1;
  }

  if (country_id != null) {
    clause.push(`s.country_id = $${i}`);
    params.push(country_id);
    i += 1;
  }

  if (city_id != null) {
    clause.push(`s.city_id = $${i}`);
    params.push(city_id);
    i += 1;
  }

  if (min_price_usd != null) {
    clause.push(`s.price_usd >= $${i}`);
    params.push(min_price_usd);
    i += 1;
  }

  if (max_price_usd != null) {
    clause.push(`s.price_usd <= $${i}`);
    params.push(max_price_usd);
    i += 1;
  }

  if (status) {
    clause.push(`s.status = $${i}`);
    params.push(status);
    i += 1;
  }

  if (cuisine != null && cuisine !== '') {
    clause.push(`r.cuisine ILIKE $${i}`);
    params.push(`%${cuisine}%`);
    i += 1;
  }

  if (activity_kind != null && activity_kind !== '') {
    clause.push(`a.activity_kind ILIKE $${i}`);
    params.push(`%${activity_kind}%`);
    i += 1;
  }

  if (origin_city_id != null) {
    clause.push(`f.origin_city_id = $${i}`);
    params.push(origin_city_id);
    i += 1;
  }

  if (destination_city_id != null) {
    clause.push(`f.destination_city_id = $${i}`);
    params.push(destination_city_id);
    i += 1;
  }

  if (q) {
    clause.push(`s.search_vector @@ plainto_tsquery('english', $${i})`);
    params.push(q);
    i += 1;
  }

  const whereSql = clause.join('\n AND ');

  const countQuery = `
    SELECT COUNT(*)::bigint AS cnt
    FROM services s
    LEFT JOIN hotels h ON h.service_id = s.id
    LEFT JOIN restaurants r ON r.service_id = s.id
    LEFT JOIN flights f ON f.service_id = s.id
    LEFT JOIN activities a ON a.service_id = s.id
    WHERE ${whereSql}
  `;

  const listQuery = `
    SELECT
      s.id,
      s.title,
      s.description,
      s.country_id,
      s.city_id,
      s.price_usd,
      s.status::text AS status,
      s.created_at,
      s.updated_at,
      CASE
        WHEN h.service_id IS NOT NULL THEN 'hotel'
        WHEN r.service_id IS NOT NULL THEN 'restaurant'
        WHEN f.service_id IS NOT NULL THEN 'flight'
        WHEN a.service_id IS NOT NULL THEN 'activity'
      END AS kind,
      h.stars AS hotel_stars,
      h.address AS hotel_address,
      r.cuisine AS restaurant_cuisine,
      f.origin_city_id AS flight_origin_city_id,
      f.destination_city_id AS flight_destination_city_id,
      f.airline AS flight_airline,
      f.depart_at AS flight_depart_at,
      f.arrive_at AS flight_arrive_at,
      a.activity_kind AS activity_kind,
      a.duration_minutes AS activity_duration_minutes
    FROM services s
    LEFT JOIN hotels h ON h.service_id = s.id
    LEFT JOIN restaurants r ON r.service_id = s.id
    LEFT JOIN flights f ON f.service_id = s.id
    LEFT JOIN activities a ON a.service_id = s.id
    WHERE ${whereSql}
    ORDER BY ${SORT_EXPR[sort]}
    OFFSET $${i} LIMIT $${i + 1}
  `;

  const offset = (page - 1) * limit;

  const [countResult, listResult] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(listQuery, [...params, offset, limit]),
  ]);

  const total = Number(countResult.rows[0]?.cnt || 0);
  const items = listResult.rows.map(mapServiceRow);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

async function getServiceDetail(query, params) {
  const result = await pool.query(query, params);
  const row = result.rows[0];
  if (!row) return null;

  return mapServiceRow(row);
}

const detailQueryPrefix = `
  SELECT
    s.id,
    s.title,
    s.description,
    s.country_id,
    s.city_id,
    s.price_usd,
    s.status::text AS status,
    s.created_at,
    s.updated_at,
    CASE
      WHEN h.service_id IS NOT NULL THEN 'hotel'
      WHEN r.service_id IS NOT NULL THEN 'restaurant'
      WHEN f.service_id IS NOT NULL THEN 'flight'
      WHEN a.service_id IS NOT NULL THEN 'activity'
    END AS kind,
    h.stars AS hotel_stars,
    h.address AS hotel_address,
    r.cuisine AS restaurant_cuisine,
    f.origin_city_id AS flight_origin_city_id,
    f.destination_city_id AS flight_destination_city_id,
    f.airline AS flight_airline,
    f.depart_at AS flight_depart_at,
    f.arrive_at AS flight_arrive_at,
    a.activity_kind AS activity_kind,
    a.duration_minutes AS activity_duration_minutes
  FROM services s
  LEFT JOIN hotels h ON h.service_id = s.id
  LEFT JOIN restaurants r ON r.service_id = s.id
  LEFT JOIN flights f ON f.service_id = s.id
  LEFT JOIN activities a ON a.service_id = s.id
`;

async function getServiceById(id) {
  return getServiceDetail(`${detailQueryPrefix} WHERE s.id = $1`, [id]);
}

async function createService(payload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO services (title, description, country_id, city_id, price_usd, status)
       VALUES ($1, $2, $3, $4, $5, $6::service_status)
       RETURNING id, title, description, country_id, city_id, price_usd, status::text AS status, created_at, updated_at`,
      [
        payload.title,
        payload.description ?? null,
        payload.country_id,
        payload.city_id,
        payload.price_usd,
        payload.status || 'draft',
      ],
    );

    const svc = inserted.rows[0];
    const { kind } = payload;

    if (kind === 'hotel') {
      const hotel = payload.hotel || {};
      await client.query(
        `INSERT INTO hotels (service_id, stars, address) VALUES ($1, $2, $3)`,
        [svc.id, hotel.stars ?? null, hotel.address ?? null],
      );
    } else if (kind === 'restaurant') {
      const restaurant = payload.restaurant;
      await client.query(`INSERT INTO restaurants (service_id, cuisine) VALUES ($1, $2)`, [
        svc.id,
        restaurant.cuisine ?? null,
      ]);
    } else if (kind === 'flight') {
      const flight = payload.flight;
      validateFlightEndpoints(flight.origin_city_id, flight.destination_city_id);
      await client.query(
        `INSERT INTO flights
          (service_id, origin_city_id, destination_city_id, airline, depart_at, arrive_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          svc.id,
          flight.origin_city_id,
          flight.destination_city_id,
          flight.airline ?? null,
          flight.depart_at ?? null,
          flight.arrive_at ?? null,
        ],
      );
    } else if (kind === 'activity') {
      const activity = payload.activity;
      await client.query(
        `INSERT INTO activities (service_id, activity_kind, duration_minutes)
         VALUES ($1, $2, $3)`,
        [svc.id, activity.activity_kind, activity.duration_minutes ?? null],
      );
    }

    await client.query('COMMIT');

    return getServiceById(svc.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function patchService(serviceId, body, dbKind) {
  let subtypeTouched = false;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const baseAssignments = [];
    const baseParams = [];

    let p = 1;

    if (body.title !== undefined) {
      baseAssignments.push(`title = $${p}`);
      baseParams.push(body.title);
      p += 1;
    }

    if (body.description !== undefined) {
      baseAssignments.push(`description = $${p}`);
      baseParams.push(body.description);
      p += 1;
    }

    if (body.country_id !== undefined) {
      baseAssignments.push(`country_id = $${p}`);
      baseParams.push(body.country_id);
      p += 1;
    }

    if (body.city_id !== undefined) {
      baseAssignments.push(`city_id = $${p}`);
      baseParams.push(body.city_id);
      p += 1;
    }

    if (body.price_usd !== undefined) {
      baseAssignments.push(`price_usd = $${p}`);
      baseParams.push(body.price_usd);
      p += 1;
    }

    if (body.status !== undefined) {
      baseAssignments.push(`status = $${p}::service_status`);
      baseParams.push(body.status);
      p += 1;
    }

    if (dbKind === 'hotel' && body.hotel) {
      const h = body.hotel;
      const cols = [];
      const params = [];

      let hp = 1;
      function add(col, val) {
        cols.push(`${col} = $${hp}`);
        params.push(val);
        hp += 1;
      }

      if (h.stars !== undefined) add('stars', h.stars);
      if (h.address !== undefined) add('address', h.address);

      if (cols.length) {
        subtypeTouched = true;
        await client.query(`UPDATE hotels SET ${cols.join(', ')} WHERE service_id = $${hp}`, [
          ...params,
          serviceId,
        ]);
      }
    }

    if (dbKind === 'restaurant' && body.restaurant) {
      const r = body.restaurant;
      if (r.cuisine !== undefined) {
        subtypeTouched = true;
        await client.query(`UPDATE restaurants SET cuisine = $1 WHERE service_id = $2`, [
          r.cuisine,
          serviceId,
        ]);
      }
    }

    if (dbKind === 'flight' && body.flight) {
      const f = body.flight;
      const current = await client.query(
        'SELECT origin_city_id, destination_city_id FROM flights WHERE service_id = $1',
        [serviceId],
      );

      const currentRow = current.rows[0];
      if (!currentRow) {
        const err = new Error('Flight details not found.');
        err.status = 404;
        throw err;
      }

      const mergedOrigin =
        f.origin_city_id !== undefined ? Number(f.origin_city_id) : Number(currentRow.origin_city_id);

      const mergedDest =
        f.destination_city_id !== undefined
          ? Number(f.destination_city_id)
          : Number(currentRow.destination_city_id);

      validateFlightEndpoints(mergedOrigin, mergedDest);

      const cols = [];
      const params = [];
      let fp = 1;

      function add(col, val) {
        cols.push(`${col} = $${fp}`);
        params.push(val);
        fp += 1;
      }

      if (f.origin_city_id !== undefined) add('origin_city_id', f.origin_city_id);
      if (f.destination_city_id !== undefined) add('destination_city_id', f.destination_city_id);
      if (f.airline !== undefined) add('airline', f.airline);
      if (f.depart_at !== undefined) add('depart_at', f.depart_at);
      if (f.arrive_at !== undefined) add('arrive_at', f.arrive_at);

      if (cols.length) {
        subtypeTouched = true;
        await client.query(`UPDATE flights SET ${cols.join(', ')} WHERE service_id = $${fp}`, [
          ...params,
          serviceId,
        ]);
      }
    }

    if (dbKind === 'activity' && body.activity) {
      const ac = body.activity;
      const cols = [];
      const params = [];
      let ap = 1;

      function add(col, val) {
        cols.push(`${col} = $${ap}`);
        params.push(val);
        ap += 1;
      }

      if (ac.activity_kind !== undefined) add('activity_kind', ac.activity_kind);
      if (ac.duration_minutes !== undefined) add('duration_minutes', ac.duration_minutes);

      if (cols.length) {
        subtypeTouched = true;
        await client.query(`UPDATE activities SET ${cols.join(', ')} WHERE service_id = $${ap}`, [
          ...params,
          serviceId,
        ]);
      }
    }

    if (baseAssignments.length) {
      const setSql = [...baseAssignments, 'updated_at = now()'].join(', ');
      const lastParam = `$${p}`;
      await client.query(`UPDATE services SET ${setSql} WHERE id = ${lastParam}`, [
        ...baseParams,
        serviceId,
      ]);
    } else if (subtypeTouched) {
      await client.query(`UPDATE services SET updated_at = now() WHERE id = $1`, [serviceId]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const updated = await getServiceById(serviceId);
  if (!updated?.kind || updated.kind !== dbKind) {
    const missing = new Error('Service not found.');
    missing.status = 404;
    throw missing;
  }

  return updated;
}

async function deleteService(serviceId) {
  const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [serviceId]);

  const deletedId = result.rows[0]?.id;
  return Boolean(deletedId);
}

async function fetchKindOnly(serviceId) {
  const result = await pool.query(`${detailQueryPrefix} WHERE s.id = $1`, [serviceId]);
  const row = result.rows[0];
  if (!row?.kind) return null;

  return row.kind;
}

module.exports = {
  listServices,
  getServiceById,
  createService,
  patchService,
  deleteService,
  fetchKindOnly,
};
