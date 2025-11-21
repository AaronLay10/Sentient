import { DomainEvent } from '@sentient/core-domain';
import { RedisChannelBuilder } from './channel-builder';

export interface RedisSubscriber {
  subscribe(...channels: string[]): Promise<void>;
  on(event: 'message', listener: (channel: string, message: string) => void): void;
  unsubscribe(...channels: string[]): Promise<void>;
}

export type EventHandler = (event: DomainEvent) => void | Promise<void>;
export type MessageHandler = (channel: string, data: any) => void | Promise<void>;

export class EventSubscriber {
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(private readonly redis: RedisSubscriber) {
    this.redis.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  async subscribeToDomainEvents(handler: EventHandler): Promise<void> {
    const channel = RedisChannelBuilder.domainEvents();
    await this.redis.subscribe(channel);

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
    }
    this.handlers.get(channel)!.push(handler);
  }

  async subscribeToRoomEvents(roomId: string, handler: EventHandler): Promise<void> {
    const channel = RedisChannelBuilder.roomEvents(roomId);
    await this.redis.subscribe(channel);

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
    }
    this.handlers.get(channel)!.push(handler);
  }

  async subscribeToSessionEvents(sessionId: string, handler: EventHandler): Promise<void> {
    const channel = RedisChannelBuilder.sessionEvents(sessionId);
    await this.redis.subscribe(channel);

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
    }
    this.handlers.get(channel)!.push(handler);
  }

  async unsubscribeFromRoom(roomId: string): Promise<void> {
    const channel = RedisChannelBuilder.roomEvents(roomId);
    await this.redis.unsubscribe(channel);
    this.handlers.delete(channel);
  }

  private handleMessage(channel: string, message: string): void {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.length === 0) return;

    try {
      const data = JSON.parse(message);
      handlers.forEach(handler => {
        Promise.resolve(handler(data)).catch(err => {
          console.error(`Error in event handler for channel ${channel}:`, err);
        });
      });
    } catch (err) {
      console.error(`Failed to parse message from channel ${channel}:`, err);
    }
  }
}
