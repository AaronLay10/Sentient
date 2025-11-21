import { DeviceType, HealthStatus } from '@sentient/core-domain';

export interface CreateDeviceDto {
  controller_id: string;
  name: string;
  type: DeviceType;
  pin?: number;
  channel?: number;
  address?: string;
  config?: Record<string, any>;
}

export interface UpdateDeviceDto {
  name?: string;
  type?: DeviceType;
  pin?: number;
  channel?: number;
  address?: string;
  config?: Record<string, any>;
  health_status?: HealthStatus;
  active?: boolean;
}

export interface DeviceDto {
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

export interface DeviceStateDto {
  device_id: string;
  state: Record<string, any>;
  timestamp: Date;
}

export interface DeviceCommandDto {
  device_id: string;
  command: string;
  params?: Record<string, any>;
}
