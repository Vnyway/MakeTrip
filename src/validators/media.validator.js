const { z } = require('zod');

const allowedImageContentTypes = z.enum(['image/jpeg', 'image/png', 'image/webp']);

const mediaPresignSchema = z
  .object({
    content_type: allowedImageContentTypes,
  })
  .strict();

const mediaRegisterSchema = z
  .object({
    key: z.string().trim().min(1).max(512),
    media_type: z.literal('image'),
    sort_order: z.number().int().min(0).optional().default(0),
  })
  .strict();

module.exports = {
  mediaPresignSchema,
  mediaRegisterSchema,
};
