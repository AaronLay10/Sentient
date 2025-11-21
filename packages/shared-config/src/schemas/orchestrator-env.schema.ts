import { z } from 'zod';
import { BaseEnvSchema } from './base-env.schema';
import { DatabaseEnvSchema } from './database-env.schema';
import { RedisEnvSchema } from './redis-env.schema';

export const OrchestratorEnvSchema = BaseEnvSchema.merge(DatabaseEnvSchema)
  .merge(RedisEnvSchema)
  .extend({
    ORCHESTRATOR_TICK_RATE_MS: z.coerce.number().int().positive().default(100),
    ORCHESTRATOR_MAX_SESSIONS: z.coerce.number().int().positive().default(50),
  });

export type OrchestratorEnv = z.infer<typeof OrchestratorEnvSchema>;
