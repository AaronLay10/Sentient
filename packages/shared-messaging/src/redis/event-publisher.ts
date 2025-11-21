import { DomainEvent } from '@sentient/core-domain';
import { RedisChannelBuilder } from './channel-builder';

export interface RedisPublisher {
  publish(channel: string, message: string): Promise<number>;
}

export class EventPublisher {
  constructor(private readonly redis: RedisPublisher) {}

  async publishDomainEvent(event: DomainEvent): Promise<void> {
    const channel = RedisChannelBuilder.domainEvents();
    await this.redis.publish(channel, JSON.stringify(event));

    // Also publish to room-specific channel if room_id exists
    if (event.room_id) {
      const roomChannel = RedisChannelBuilder.roomEvents(event.room_id);
      await this.redis.publish(roomChannel, JSON.stringify(event));
    }

    // Publish to session-specific channel if session_id exists
    if (event.session_id) {
      const sessionChannel = RedisChannelBuilder.sessionEvents(event.session_id);
      await this.redis.publish(sessionChannel, JSON.stringify(event));
    }
  }

  async publishToRoom(roomId: string, data: any): Promise<void> {
    const channel = RedisChannelBuilder.realtimeRoom(roomId);
    await this.redis.publish(channel, JSON.stringify(data));
  }

  async publishBroadcast(data: any): Promise<void> {
    const channel = RedisChannelBuilder.realtimeBroadcast();
    await this.redis.publish(channel, JSON.stringify(data));
  }
}
