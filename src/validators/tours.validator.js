const { z } = require('zod');
const { uuidSchema } = require('./services.validator');

const tourCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .strict();

const tourPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .strict()
  .refine((data) => data.title !== undefined || data.notes !== undefined, {
    message: 'Provide at least one of: title, notes.',
  });

const tourItemCreateSchema = z
  .object({
    service_id: uuidSchema,
    day_number: z.number().int().min(1),
    position: z.number().int().min(0).optional().default(0),
    quantity: z.number().int().min(1).optional().default(1),
    note: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const tourItemPatchSchema = z
  .object({
    service_id: uuidSchema.optional(),
    day_number: z.number().int().min(1).optional(),
    position: z.number().int().min(0).optional(),
    quantity: z.number().int().min(1).optional(),
    note: z.string().trim().max(2000).optional().nullable(),
  })
  .strict()
  .refine(
    (data) =>
      data.service_id !== undefined ||
      data.day_number !== undefined ||
      data.position !== undefined ||
      data.quantity !== undefined ||
      data.note !== undefined,
    { message: 'Provide at least one field to update.' },
  );

module.exports = {
  uuidSchema,
  tourCreateSchema,
  tourPatchSchema,
  tourItemCreateSchema,
  tourItemPatchSchema,
};
