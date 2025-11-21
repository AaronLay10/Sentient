import { z } from 'zod';

export const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_TIMEOUT: z.coerce.number().int().positive().default(30000),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;
