import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PG_POOL } from './database.module';
import { REDIS_CLIENT } from './redis.module';
import { Pool } from 'pg';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error as Error);
      return false;
    }
  }
}
