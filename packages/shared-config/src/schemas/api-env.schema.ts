import { z } from 'zod';
import { BaseEnvSchema } from './base-env.schema';
import { DatabaseEnvSchema } from './database-env.schema';
import { RedisEnvSchema } from './redis-env.schema';
import { MqttEnvSchema } from './mqtt-env.schema';

export const ApiEnvSchema = BaseEnvSchema.merge(DatabaseEnvSchema)
  .merge(RedisEnvSchema)
  .merge(MqttEnvSchema)
  .extend({
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_HOST: z.string().default('0.0.0.0'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRATION: z.string().default('24h'),
    INTERNAL_REG_TOKEN: z.string().min(32),
    CORS_ORIGINS: z.string().default('*'),
  });

export type ApiEnv = z.infer<typeof ApiEnvSchema>;
