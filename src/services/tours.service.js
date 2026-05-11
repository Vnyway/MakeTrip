const { pool } = require('../config/db');
const { assertServiceExists } = require('./userInteractions.service');

const SERVICE_KIND_SELECT = `
  CASE
    WHEN h.service_id IS NOT NULL THEN 'hotel'
    WHEN r.service_id IS NOT NULL THEN 'restaurant'
    WHEN fl.service_id IS NOT NULL THEN 'flight'
    WHEN a.service_id IS NOT NULL THEN 'activity'
  END AS kind
`;

async function assertTourOwned(client, userId, tourId) {
  const result = await client.query(
    `SELECT id, user_id, title, notes, created_at, updated_at
     FROM tours
     WHERE id = $1 AND user_id = $2`,
    [tourId, userId],
  );

  if (!result.rowCount) {
    const err = new Error('Tour not found.');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

function mapTourItemRow(row) {
  return {
    id: row.item_id,
    tour_id: row.tour_id,
    service_id: row.service_id,
    day_number: Number(row.day_number),
    position: Number(row.position),
    quantity: Number(row.quantity),
    note: row.note,
    service: {
      id: row.service_id,
      title: row.title,
      description: row.description,
      country_id: row.country_id,
      city_id: row.city_id,
      price_usd: Number(row.price_usd),
      status: row.service_status,
      kind: row.kind,
    },
  };
}

async function listTours(userId) {
  const result = await pool.query(
    `SELECT id, user_id, title, notes, created_at, updated_at
     FROM tours
     WHERE user_id = $1
     ORDER BY updated_at DESC, created_at DESC`,
    [userId],
  );

  return result.rows;
}

async function getTourWithItems(userId, tourId) {
  await assertTourOwned(pool, userId, tourId);

  const tourResult = await pool.query(
    `SELECT id, user_id, title, notes, created_at, updated_at
     FROM tours
     WHERE id = $1`,
    [tourId],
  );

  const tour = tourResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT
       ti.id AS item_id,
       ti.tour_id,
       ti.service_id,
       ti.day_number,
       ti.position,
       ti.quantity,
       ti.note,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS service_status,
       ${SERVICE_KIND_SELECT}
     FROM tour_items ti
     JOIN services s ON s.id = ti.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants r ON r.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE ti.tour_id = $1
     ORDER BY ti.day_number ASC, ti.position ASC, ti.id ASC`,
    [tourId],
  );

  return {
    tour,
    items: itemsResult.rows.map(mapTourItemRow),
  };
}

async function createTour(userId, { title, notes }) {
  const result = await pool.query(
    `INSERT INTO tours (user_id, title, notes)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, title, notes, created_at, updated_at`,
    [userId, title, notes ?? null],
  );

  return result.rows[0];
}

async function updateTour(userId, tourId, { title, notes }) {
  const assignments = [];
  const params = [];
  let p = 1;

  if (title !== undefined) {
    assignments.push(`title = $${p}`);
    params.push(title);
    p += 1;
  }

  if (notes !== undefined) {
    assignments.push(`notes = $${p}`);
    params.push(notes);
    p += 1;
  }

  assignments.push(`updated_at = now()`);

  const idParam = `$${p}`;
  const userParam = `$${p + 1}`;

  const result = await pool.query(
    `UPDATE tours
     SET ${assignments.join(', ')}
     WHERE id = ${idParam} AND user_id = ${userParam}
     RETURNING id, user_id, title, notes, created_at, updated_at`,
    [...params, tourId, userId],
  );

  if (!result.rowCount) {
    const err = new Error('Tour not found.');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function deleteTour(userId, tourId) {
  const result = await pool.query(`DELETE FROM tours WHERE id = $1 AND user_id = $2 RETURNING id`, [
    tourId,
    userId,
  ]);

  return Boolean(result.rowCount);
}

async function addTourItem(userId, tourId, payload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertTourOwned(client, userId, tourId);
    await assertServiceExists(client, payload.service_id);

    const inserted = await client.query(
      `INSERT INTO tour_items (tour_id, service_id, day_number, position, quantity, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tour_id, service_id, day_number, position, quantity, note`,
      [
        tourId,
        payload.service_id,
        payload.day_number,
        payload.position ?? 0,
        payload.quantity ?? 1,
        payload.note ?? null,
      ],
    );

    await client.query(`UPDATE tours SET updated_at = now() WHERE id = $1`, [tourId]);

    await client.query('COMMIT');

    const item = inserted.rows[0];
    const full = await getTourItemById(userId, tourId, item.id);
    return full;
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Item with this day_number and position already exists.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getTourItemById(userId, tourId, itemId) {
  await assertTourOwned(pool, userId, tourId);

  const result = await pool.query(
    `SELECT
       ti.id AS item_id,
       ti.tour_id,
       ti.service_id,
       ti.day_number,
       ti.position,
       ti.quantity,
       ti.note,
       s.title,
       s.description,
       s.country_id,
       s.city_id,
       s.price_usd,
       s.status::text AS service_status,
       ${SERVICE_KIND_SELECT}
     FROM tour_items ti
     JOIN services s ON s.id = ti.service_id
     LEFT JOIN hotels h ON h.service_id = s.id
     LEFT JOIN restaurants r ON r.service_id = s.id
     LEFT JOIN flights fl ON fl.service_id = s.id
     LEFT JOIN activities a ON a.service_id = s.id
     WHERE ti.id = $1 AND ti.tour_id = $2`,
    [itemId, tourId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return mapTourItemRow(row);
}

async function updateTourItem(userId, tourId, itemId, body) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertTourOwned(client, userId, tourId);

    const existing = await client.query(
      `SELECT id, day_number, position FROM tour_items WHERE id = $1 AND tour_id = $2 FOR UPDATE`,
      [itemId, tourId],
    );

    if (!existing.rowCount) {
      const err = new Error('Tour item not found.');
      err.status = 404;
      throw err;
    }

    const cur = existing.rows[0];
    const curDay = Number(cur.day_number);
    const curPos = Number(cur.position);

    if (body.service_id !== undefined) {
      await assertServiceExists(client, body.service_id);
    }

    const explicitDay = body.day_number !== undefined;
    const explicitPos = body.position !== undefined;

    let nextDay = explicitDay ? body.day_number : curDay;
    let nextPos = explicitPos ? body.position : curPos;

    // Moving to another day without an explicit new position: append to the end of the target day
    // so we never violate UNIQUE (tour_id, day_number, position) by keeping the old slot number.
    if (explicitDay && body.day_number !== curDay && !explicitPos) {
      const pr = await client.query(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
         FROM tour_items
         WHERE tour_id = $1 AND day_number = $2 AND id <> $3`,
        [tourId, body.day_number, itemId],
      );
      nextPos = Number(pr.rows[0].next_pos);
    }

    const assignments = [];
    const params = [];
    let p = 1;

    if (body.service_id !== undefined) {
      assignments.push(`service_id = $${p}`);
      params.push(body.service_id);
      p += 1;
    }

    if (explicitDay || explicitPos) {
      assignments.push(`day_number = $${p}`);
      params.push(nextDay);
      p += 1;
      assignments.push(`position = $${p}`);
      params.push(nextPos);
      p += 1;
    }

    if (body.quantity !== undefined) {
      assignments.push(`quantity = $${p}`);
      params.push(body.quantity);
      p += 1;
    }

    if (body.note !== undefined) {
      assignments.push(`note = $${p}`);
      params.push(body.note);
      p += 1;
    }

    await client.query(
      `UPDATE tour_items SET ${assignments.join(', ')} WHERE id = $${p} AND tour_id = $${p + 1}`,
      [...params, itemId, tourId],
    );

    await client.query(`UPDATE tours SET updated_at = now() WHERE id = $1`, [tourId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Item with this day_number and position already exists.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }

  const item = await getTourItemById(userId, tourId, itemId);
  if (!item) {
    const err = new Error('Tour item not found.');
    err.status = 404;
    throw err;
  }

  return item;
}

async function deleteTourItem(userId, tourId, itemId) {
  await assertTourOwned(pool, userId, tourId);

  const result = await pool.query(
    `DELETE FROM tour_items WHERE id = $1 AND tour_id = $2 RETURNING id`,
    [itemId, tourId],
  );

  if (result.rowCount) {
    await pool.query(`UPDATE tours SET updated_at = now() WHERE id = $1`, [tourId]);
  }

  return Boolean(result.rowCount);
}

module.exports = {
  listTours,
  getTourWithItems,
  createTour,
  updateTour,
  deleteTour,
  addTourItem,
  updateTourItem,
  deleteTourItem,
};
