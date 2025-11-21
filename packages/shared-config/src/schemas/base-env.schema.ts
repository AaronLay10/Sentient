import { z } from 'zod';

export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type BaseEnv = z.infer<typeof BaseEnvSchema>;
