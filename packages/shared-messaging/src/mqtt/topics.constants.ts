// MQTT Topic Patterns for Sentient Engine
// All topics follow snake_case convention

export const MQTT_TOPICS = {
  // Device state topics
  DEVICE_STATE: 'sentient/room/{room_id}/controller/{controller_id}/device/{device_id}/state',

  // Device command topics
  DEVICE_COMMAND: 'sentient/room/{room_id}/controller/{controller_id}/device/{device_id}/command',

  // Device command acknowledgment
  DEVICE_COMMAND_ACK: 'sentient/room/{room_id}/controller/{controller_id}/device/{device_id}/command/ack',

  // Controller topics
  CONTROLLER_HEARTBEAT: 'sentient/room/{room_id}/controller/{controller_id}/heartbeat',
  CONTROLLER_STATUS: 'sentient/room/{room_id}/controller/{controller_id}/status',
  CONTROLLER_REGISTER: 'sentient/controller/register',

  // Room-wide broadcast
  ROOM_BROADCAST: 'sentient/room/{room_id}/broadcast/command',

  // System topics
  SYSTEM_STATUS: 'sentient/system/status',
  SYSTEM_COMMAND: 'sentient/system/command',
} as const;

export const MQTT_QOS = {
  AT_MOST_ONCE: 0,
  AT_LEAST_ONCE: 1,
  EXACTLY_ONCE: 2,
} as const;

export const DEFAULT_QOS = MQTT_QOS.AT_LEAST_ONCE;
