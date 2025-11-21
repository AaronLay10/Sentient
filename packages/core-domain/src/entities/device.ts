import { DeviceType, HealthStatus } from '../enums';

export interface Device {
  id: string;
  controller_id: string;
  name: string;
  type: DeviceType;
  pin?: number;
  channel?: number;
  address?: string;
  config?: Record<string, any>;
  state?: Record<string, any>;
  health_status: HealthStatus;
  last_state_change?: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceState {
  device_id: string;
  state: Record<string, any>;
  timestamp: Date;
}

export interface DeviceCommand {
  device_id: string;
  command: string;
  params?: Record<string, any>;
  timestamp: Date;
  issued_by?: string;
}
