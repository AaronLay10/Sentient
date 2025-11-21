import { MQTT_TOPICS } from './topics.constants';

export class MqttTopicBuilder {
  static deviceState(roomId: string, controllerId: string, deviceId: string): string {
    return MQTT_TOPICS.DEVICE_STATE
      .replace('{room_id}', roomId)
      .replace('{controller_id}', controllerId)
      .replace('{device_id}', deviceId);
  }

  static deviceCommand(roomId: string, controllerId: string, deviceId: string): string {
    return MQTT_TOPICS.DEVICE_COMMAND
      .replace('{room_id}', roomId)
      .replace('{controller_id}', controllerId)
      .replace('{device_id}', deviceId);
  }

  static deviceCommandAck(roomId: string, controllerId: string, deviceId: string): string {
    return MQTT_TOPICS.DEVICE_COMMAND_ACK
      .replace('{room_id}', roomId)
      .replace('{controller_id}', controllerId)
      .replace('{device_id}', deviceId);
  }

  static controllerHeartbeat(roomId: string, controllerId: string): string {
    return MQTT_TOPICS.CONTROLLER_HEARTBEAT
      .replace('{room_id}', roomId)
      .replace('{controller_id}', controllerId);
  }

  static controllerStatus(roomId: string, controllerId: string): string {
    return MQTT_TOPICS.CONTROLLER_STATUS
      .replace('{room_id}', roomId)
      .replace('{controller_id}', controllerId);
  }

  static roomBroadcast(roomId: string): string {
    return MQTT_TOPICS.ROOM_BROADCAST.replace('{room_id}', roomId);
  }

  static controllerRegister(): string {
    return MQTT_TOPICS.CONTROLLER_REGISTER;
  }

  // Wildcard subscriptions
  static allDeviceStates(roomId?: string, controllerId?: string): string {
    if (roomId && controllerId) {
      return `sentient/room/${roomId}/controller/${controllerId}/device/+/state`;
    } else if (roomId) {
      return `sentient/room/${roomId}/controller/+/device/+/state`;
    }
    return 'sentient/room/+/controller/+/device/+/state';
  }

  static allControllerHeartbeats(roomId?: string): string {
    if (roomId) {
      return `sentient/room/${roomId}/controller/+/heartbeat`;
    }
    return 'sentient/room/+/controller/+/heartbeat';
  }

  static allRoomTopics(roomId: string): string {
    return `sentient/room/${roomId}/#`;
  }
}
