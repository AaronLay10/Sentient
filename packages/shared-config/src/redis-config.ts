import { RedisEnv } from './schemas';

export interface RedisConfig {
  url: string;
  ttlSeconds: number;
  maxRetries: number;
}

export function createRedisConfig(env: RedisEnv): RedisConfig {
  return {
    url: env.REDIS_URL,
    ttlSeconds: env.REDIS_TTL_SECONDS,
    maxRetries: env.REDIS_MAX_RETRIES,
  };
}
