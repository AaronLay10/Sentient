export interface DeviceCommandPayload {
  v: number; // version
  type: 'device_command';
  controller_id: string;
  device_id: string;
  command: string;
  params?: Record<string, any>;
  timestamp: string;
  command_id?: string;
}

export interface DeviceCommandAckPayload {
  v: number;
  type: 'device_command_ack';
  controller_id: string;
  device_id: string;
  command_id: string;
  success: boolean;
  error?: string;
  timestamp: string;
}
