const { z } = require('zod');
const { serviceKindEnum } = require('./services.validator');

const vacationTypeEnum = z.enum(['relax', 'adventure', 'cultural', 'family', 'business']);

const profilePreferencesSchema = z
  .object({
    preferred_kind: serviceKindEnum.optional(),
    preferred_activity_kind: z.string().trim().min(1).max(80).optional(),
    budget_max_usd: z.coerce.number().positive().max(1_000_000).optional(),
    vacation_type: vacationTypeEnum.optional(),
  })
  .strict();

module.exports = {
  profilePreferencesSchema,
};

