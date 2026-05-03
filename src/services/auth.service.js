const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

async function getRoleIdByName(client, roleName) {
  const result = await client.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [
    roleName,
  ]);

  const roleId = result.rows[0]?.id;
  if (!roleId) {
    const err = new Error(`Role '${roleName}' missing. Run db/seed.sql.`);
    err.status = 500;
    throw err;
  }

  return roleId;
}

async function register({ email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertUser = await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, is_email_verified, status, created_at`,
      [email, passwordHash],
    );

    const user = insertUser.rows[0];

    const userRoleId = await getRoleIdByName(client, 'user');

    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [
      user.id,
      userRoleId,
    ]);

    await client.query('COMMIT');

    return {
      id: user.id,
      email: user.email,
      roles: ['user'],
      status: user.status,
      createdAt: user.created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Email already registered.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function findUserWithRolesByEmail(email) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.password_hash,
       u.status,
       COALESCE(array_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = LOWER($1)
     GROUP BY u.id`,
    [email],
  );

  return result.rows[0] || null;
}

async function login({ email, password }) {
  const user = await findUserWithRolesByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  if (user.status !== 'active') {
    const err = new Error('Account is not active.');
    err.status = 403;
    throw err;
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  await pool.query(
    'UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1',
    [user.id],
  );

  return {
    userId: user.id,
    email: user.email,
    roles: user.roles.length ? user.roles : ['user'],
  };
}

module.exports = {
  register,
  login,
  findUserWithRolesByEmail,
};
