import { REDIS_CHANNELS } from './channels.constants';

export class RedisChannelBuilder {
  static domainEvents(): string {
    return REDIS_CHANNELS.DOMAIN_EVENTS;
  }

  static roomEvents(roomId: string): string {
    return REDIS_CHANNELS.ROOM_EVENTS.replace('{room_id}', roomId);
  }

  static sessionEvents(sessionId: string): string {
    return REDIS_CHANNELS.SESSION_EVENTS.replace('{session_id}', sessionId);
  }

  static controllerEvents(controllerId: string): string {
    return REDIS_CHANNELS.CONTROLLER_EVENTS.replace('{controller_id}', controllerId);
  }

  static deviceEvents(deviceId: string): string {
    return REDIS_CHANNELS.DEVICE_EVENTS.replace('{device_id}', deviceId);
  }

  static gmCommands(): string {
    return REDIS_CHANNELS.GM_COMMANDS;
  }

  static deviceCommands(): string {
    return REDIS_CHANNELS.DEVICE_COMMANDS;
  }

  static realtimeBroadcast(): string {
    return REDIS_CHANNELS.REALTIME_BROADCAST;
  }

  static realtimeRoom(roomId: string): string {
    return REDIS_CHANNELS.REALTIME_ROOM.replace('{room_id}', roomId);
  }
}
