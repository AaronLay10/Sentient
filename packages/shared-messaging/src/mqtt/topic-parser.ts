export interface ParsedDeviceTopic {
  room_id: string;
  controller_id: string;
  device_id: string;
  topic_type: 'state' | 'command' | 'command_ack';
}

export interface ParsedControllerTopic {
  room_id: string;
  controller_id: string;
  topic_type: 'heartbeat' | 'status';
}

export class MqttTopicParser {
  static parseDeviceTopic(topic: string): ParsedDeviceTopic | null {
    const deviceStateRegex = /^sentient\/room\/([^/]+)\/controller\/([^/]+)\/device\/([^/]+)\/state$/;
    const deviceCommandRegex = /^sentient\/room\/([^/]+)\/controller\/([^/]+)\/device\/([^/]+)\/command$/;
    const deviceCommandAckRegex = /^sentient\/room\/([^/]+)\/controller\/([^/]+)\/device\/([^/]+)\/command\/ack$/;

    let match = topic.match(deviceStateRegex);
    if (match) {
      return {
        room_id: match[1],
        controller_id: match[2],
        device_id: match[3],
        topic_type: 'state',
      };
    }

    match = topic.match(deviceCommandRegex);
    if (match) {
      return {
        room_id: match[1],
        controller_id: match[2],
        device_id: match[3],
        topic_type: 'command',
      };
    }

    match = topic.match(deviceCommandAckRegex);
    if (match) {
      return {
        room_id: match[1],
        controller_id: match[2],
        device_id: match[3],
        topic_type: 'command_ack',
      };
    }

    return null;
  }

  static parseControllerTopic(topic: string): ParsedControllerTopic | null {
    const heartbeatRegex = /^sentient\/room\/([^/]+)\/controller\/([^/]+)\/heartbeat$/;
    const statusRegex = /^sentient\/room\/([^/]+)\/controller\/([^/]+)\/status$/;

    let match = topic.match(heartbeatRegex);
    if (match) {
      return {
        room_id: match[1],
        controller_id: match[2],
        topic_type: 'heartbeat',
      };
    }

    match = topic.match(statusRegex);
    if (match) {
      return {
        room_id: match[1],
        controller_id: match[2],
        topic_type: 'status',
      };
    }

    return null;
  }

  static isDeviceStateTopic(topic: string): boolean {
    return /^sentient\/room\/[^/]+\/controller\/[^/]+\/device\/[^/]+\/state$/.test(topic);
  }

  static isControllerHeartbeatTopic(topic: string): boolean {
    return /^sentient\/room\/[^/]+\/controller\/[^/]+\/heartbeat$/.test(topic);
  }

  static isControllerRegisterTopic(topic: string): boolean {
    return topic === 'sentient/controller/register';
  }
}
