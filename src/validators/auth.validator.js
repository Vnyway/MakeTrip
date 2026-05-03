const { z } = require('zod');

const emailSchema = z
  .string()
  .trim()
  .email('Invalid email.')
  .max(255)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };
