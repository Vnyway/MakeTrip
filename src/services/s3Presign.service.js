const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { aws } = require('../config/env');

const PUT_EXPIRES_SECONDS = 15 * 60;
const GET_EXPIRES_SECONDS = 60 * 60;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let client;

function assertAwsConfigured() {
  if (!aws) {
    const err = new Error('AWS S3 is not configured on this server.');
    err.status = 503;
    throw err;
  }

  return aws;
}

function objectKeyFromStoredUrl(storedUrl) {
  const cfg = assertAwsConfigured();
  const prefix = `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/`;

  if (!storedUrl.startsWith(prefix)) {
    const err = new Error('Stored media URL has unexpected format.');
    err.status = 500;
    throw err;
  }

  const raw = storedUrl.slice(prefix.length);
  return raw.split('/').map((segment) => decodeURIComponent(segment)).join('/');
}

function getS3Client() {
  const cfg = assertAwsConfigured();

  if (!client) {
    client = new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  return { s3: client, cfg };
}

function extensionForContentType(contentType) {
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';

  return '';
}

function buildPublicObjectUrl(bucket, region, key) {
  const encodedKey = key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

async function presignPutForServiceImage({ serviceId, contentType }) {
  const { s3, cfg } = getS3Client();

  const ext = extensionForContentType(contentType);
  const objectKey = `services/${serviceId}/${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PUT_EXPIRES_SECONDS });

  return {
    bucket: cfg.bucket,
    region: cfg.region,
    key: objectKey,
    upload_url: uploadUrl,
    headers: {
      'Content-Type': contentType,
    },
    expires_in_seconds: PUT_EXPIRES_SECONDS,
    max_bytes: MAX_UPLOAD_BYTES,
    object_url: buildPublicObjectUrl(cfg.bucket, cfg.region, objectKey),
  };
}

async function presignGetObject({ key }) {
  const { s3, cfg } = getS3Client();

  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });

  const download_url = await getSignedUrl(s3, command, { expiresIn: GET_EXPIRES_SECONDS });

  return {
    download_url,
    expires_in_seconds: GET_EXPIRES_SECONDS,
  };
}

async function assertObjectExists({ key }) {
  const { s3, cfg } = getS3Client();

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );
  } catch (error) {
    const err = new Error('Uploaded object not found in S3 yet (or access denied).');
    err.status = 400;
    throw err;
  }
}

module.exports = {
  assertAwsConfigured,
  buildPublicObjectUrl,
  objectKeyFromStoredUrl,
  presignPutForServiceImage,
  presignGetObject,
  assertObjectExists,
  MAX_UPLOAD_BYTES,
};
