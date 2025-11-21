export class MqttMessageValidator {
  static validateDeviceState(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.v !== 1) return false;
    if (payload.type !== 'device_state') return false;
    if (!payload.controller_id || !payload.device_id) return false;
    if (!payload.state || typeof payload.state !== 'object') return false;
    if (!payload.timestamp) return false;
    return true;
  }

  static validateDeviceCommand(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.v !== 1) return false;
    if (payload.type !== 'device_command') return false;
    if (!payload.controller_id || !payload.device_id) return false;
    if (!payload.command || typeof payload.command !== 'string') return false;
    if (!payload.timestamp) return false;
    return true;
  }

  static validateControllerHeartbeat(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.v !== 1) return false;
    if (payload.type !== 'controller_heartbeat') return false;
    if (!payload.controller_id) return false;
    if (typeof payload.uptime_seconds !== 'number') return false;
    if (!payload.timestamp) return false;
    return true;
  }

  static validateControllerRegistration(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.v !== 1) return false;
    if (payload.type !== 'controller_registration') return false;
    if (!payload.controller_id || !payload.controller_type) return false;
    if (!payload.timestamp) return false;
    return true;
  }
}
