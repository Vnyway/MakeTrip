const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

function optionalAwsConfig() {
  const region = (process.env.AWS_REGION || '').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.S3_BUCKET || '').trim();

  if (!region && !accessKeyId && !secretAccessKey && !bucket) {
    return null;
  }

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'Incomplete AWS S3 configuration. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET together.',
    );
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  aws: optionalAwsConfig(),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  },
};
