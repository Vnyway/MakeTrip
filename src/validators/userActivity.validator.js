const { z } = require('zod');
const { uuidSchema } = require('./services.validator');

const favoriteBodySchema = z
  .object({
    service_id: uuidSchema,
  })
  .strict();

const reviewCreateSchema = z
  .object({
    service_id: uuidSchema,
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(5000).optional().nullable(),
  })
  .strict();

const reviewPatchSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(5000).optional().nullable(),
  })
  .strict()
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: 'Provide at least one of: rating, comment.',
  });

const bookingStatusEnum = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);

const bookingCreateSchema = z.object({
  service_id: uuidSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  persons_count: z.number().int().positive(),
  total_price_usd: z.number().nonnegative(),
  status: bookingStatusEnum.optional(),
  booking_meta: z.record(z.any()).optional().default({}),
});

const bookingPatchSchema = z
  .object({
    status: bookingStatusEnum,
  })
  .strict();

const interactionLogSchema = z
  .object({
    service_id: uuidSchema,
    interaction_type: z.enum(['view', 'click']),
    meta: z.any().optional(),
  })
  .strict();

module.exports = {
  uuidSchema,
  favoriteBodySchema,
  reviewCreateSchema,
  reviewPatchSchema,
  bookingCreateSchema,
  bookingPatchSchema,
  interactionLogSchema,
};
