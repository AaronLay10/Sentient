import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const redisUrl = config.getOrThrow<string>('REDIS_URL');
    return new Redis(redisUrl);
  }
};

@Module({
  providers: [redisProvider],
  exports: [redisProvider]
})
export class RedisModule {}
