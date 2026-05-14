const { z } = require('zod');

const serviceKindEnum = z.enum(['hotel', 'restaurant', 'flight', 'activity']);

const serviceStatusEnum = z.enum(['draft', 'active', 'inactive']);

const hotelFieldsSchema = z
  .object({
    stars: z.number().int().min(1).max(5).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
  })
  .strict();

const restaurantFieldsSchema = z
  .object({
    cuisine: z.string().max(120).optional().nullable(),
  })
  .strict();

const flightFieldsSchema = z
  .object({
    origin_city_id: z.coerce.number().int().positive(),
    destination_city_id: z.coerce.number().int().positive(),
    airline: z.string().max(120).optional().nullable(),
    depart_at: z.coerce.date().optional().nullable(),
    arrive_at: z.coerce.date().optional().nullable(),
  })
  .strict();

const flightCreateSchema = flightFieldsSchema.refine(
  (data) => data.origin_city_id !== data.destination_city_id,
  {
    message: 'origin_city_id and destination_city_id must differ.',
    path: ['destination_city_id'],
  },
);

const activityFieldsSchema = z
  .object({
    activity_kind: z.string().min(1).max(80),
    duration_minutes: z.number().int().positive().optional().nullable(),
  })
  .strict();

const baseServiceFieldsSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  country_id: z.coerce.number().int().positive(),
  city_id: z.coerce.number().int().positive(),
  price_usd: z.coerce.number().nonnegative(),
  status: serviceStatusEnum.optional(),
});

const catalogCreateSchema = z.discriminatedUnion('kind', [
  baseServiceFieldsSchema
    .extend({
      kind: z.literal('hotel'),
      hotel: hotelFieldsSchema.optional(),
    })
    .strict(),
  baseServiceFieldsSchema
    .extend({
      kind: z.literal('restaurant'),
      restaurant: restaurantFieldsSchema,
    })
    .strict(),
  baseServiceFieldsSchema.extend({ kind: z.literal('flight'), flight: flightCreateSchema }).strict(),
  baseServiceFieldsSchema.extend({ kind: z.literal('activity'), activity: activityFieldsSchema }).strict(),
]);

function buildCatalogPatchSchema(kind) {
  const patchBaseSchema = baseServiceFieldsSchema.partial().strict();

  if (kind === 'hotel') {
    return patchBaseSchema.extend({
      hotel: hotelFieldsSchema.partial().optional(),
    });
  }

  if (kind === 'restaurant') {
    return patchBaseSchema.extend({
      restaurant: restaurantFieldsSchema.partial().optional(),
    });
  }

  if (kind === 'flight') {
    return patchBaseSchema.extend({
      flight: flightFieldsSchema.partial().optional(),
    });
  }

  if (kind === 'activity') {
    return patchBaseSchema.extend({
      activity: activityFieldsSchema.partial().optional(),
    });
  }

  throw new Error('Unknown service kind.');
}

const listQuerySchema = z
  .object({
    kind: serviceKindEnum.optional(),
    country_id: z.coerce.number().int().positive().optional(),
    city_id: z.coerce.number().int().positive().optional(),
    min_price_usd: z.coerce.number().nonnegative().optional(),
    max_price_usd: z.coerce.number().nonnegative().optional(),
    status: serviceStatusEnum.optional(),
    cuisine: z.string().trim().min(1).max(120).optional(),
    activity_kind: z.string().trim().min(1).max(80).optional(),
    origin_city_id: z.coerce.number().int().positive().optional(),
    destination_city_id: z.coerce.number().int().positive().optional(),
    q: z.string().trim().min(1).max(200).optional(),
    tags: z
      .string()
      .optional()
      .transform((val) =>
        val ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      ),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    sort: z
      .enum(['recommended', 'price_usd asc', 'price_usd desc', 'created_at asc', 'created_at desc'])
      .optional()
      .default('recommended'),
  })
  .superRefine((data, ctx) => {
    if (
      data.min_price_usd != null &&
      data.max_price_usd != null &&
      data.min_price_usd > data.max_price_usd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'min_price_usd cannot be greater than max_price_usd.',
        path: ['min_price_usd'],
      });
    }
  });

const uuidSchema = z.string().uuid();

module.exports = {
  catalogCreateSchema,
  buildCatalogPatchSchema,
  listQuerySchema,
  uuidSchema,
  serviceKindEnum,
  serviceStatusEnum,
};
