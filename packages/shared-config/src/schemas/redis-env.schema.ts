import { z } from 'zod';

export const RedisEnvSchema = z.object({
  REDIS_URL: z.string().url(),
  REDIS_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  REDIS_MAX_RETRIES: z.coerce.number().int().positive().default(3),
});

export type RedisEnv = z.infer<typeof RedisEnvSchema>;
