export interface DeviceStatePayload {
  v: number; // version
  type: 'device_state';
  controller_id: string;
  device_id: string;
  state: Record<string, any>;
  timestamp: string;
}

export interface DeviceStateChangePayload {
  v: number;
  type: 'device_state_changed';
  controller_id: string;
  device_id: string;
  previous_state?: Record<string, any>;
  new_state: Record<string, any>;
  timestamp: string;
}
