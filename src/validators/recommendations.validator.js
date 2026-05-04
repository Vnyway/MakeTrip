const { z } = require('zod');
const { serviceKindEnum, serviceStatusEnum } = require('./services.validator');

const recommendationQuerySchema = z
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
    limit: z.coerce.number().int().positive().max(50).optional().default(20),
    candidate_limit: z.coerce.number().int().positive().max(400).optional().default(200),
    persist: z.preprocess((value) => value === true || value === 'true', z.boolean().optional().default(false)),
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

module.exports = { recommendationQuerySchema };
