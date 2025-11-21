import Redis from 'ioredis';

export class RedisSubscriberAdapter {
  constructor(private redis: Redis) {}

  async subscribe(...channels: string[]): Promise<void> {
    await this.redis.subscribe(...channels);
  }

  on(event: 'message', listener: (channel: string, message: string) => void): void {
    this.redis.on(event, listener);
  }

  async unsubscribe(...channels: string[]): Promise<void> {
    await this.redis.unsubscribe(...channels);
  }
}
