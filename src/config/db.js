const { Pool } = require('pg');
const { db } = require('./env');

const pool = new Pool(db);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error);
});

async function pingDatabase() {
  const result = await pool.query('SELECT NOW() AS db_time');
  return result.rows[0];
}

module.exports = {
  pool,
  pingDatabase,
};
