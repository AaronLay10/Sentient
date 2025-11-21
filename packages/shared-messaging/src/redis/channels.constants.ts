// Redis Pub/Sub Channel Patterns

export const REDIS_CHANNELS = {
  // Domain Events
  DOMAIN_EVENTS: 'sentient:events:domain',

  // Per-room event channels
  ROOM_EVENTS: 'sentient:events:room:{room_id}',

  // Per-session event channels
  SESSION_EVENTS: 'sentient:events:session:{session_id}',

  // Controller events
  CONTROLLER_EVENTS: 'sentient:events:controller:{controller_id}',

  // Device events
  DEVICE_EVENTS: 'sentient:events:device:{device_id}',

  // Commands from GM UI -> Orchestrator
  GM_COMMANDS: 'sentient:commands:gm',

  // Commands from Orchestrator -> MQTT Gateway
  DEVICE_COMMANDS: 'sentient:commands:device',

  // Realtime Gateway channels
  REALTIME_BROADCAST: 'sentient:realtime:broadcast',
  REALTIME_ROOM: 'sentient:realtime:room:{room_id}',
} as const;
