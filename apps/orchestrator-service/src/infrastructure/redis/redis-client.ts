import Redis from 'ioredis';
import { Logger } from '@sentient/shared-logging';

export class RedisClient {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(url: string, private readonly logger: Logger) {
    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);

    this.publisher.on('connect', () => {
      this.logger.info('Redis publisher connected');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });

    this.subscriber.on('connect', () => {
      this.logger.info('Redis subscriber connected');
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err);
    });
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async disconnect(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.logger.info('Redis disconnected');
  }
}
