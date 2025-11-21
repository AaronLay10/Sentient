import { DatabaseEnv } from './schemas';

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  timeout: number;
}

export function createDatabaseConfig(env: DatabaseEnv): DatabaseConfig {
  return {
    url: env.DATABASE_URL,
    poolMin: env.DATABASE_POOL_MIN,
    poolMax: env.DATABASE_POOL_MAX,
    timeout: env.DATABASE_TIMEOUT,
  };
}
