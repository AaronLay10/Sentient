import { ControllerType, HealthStatus } from '@sentient/core-domain';

export interface CreateControllerDto {
  room_id: string;
  name: string;
  type: ControllerType;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  hardware_version?: string;
  metadata?: Record<string, any>;
}

export interface UpdateControllerDto {
  name?: string;
  type?: ControllerType;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  hardware_version?: string;
  health_status?: HealthStatus;
  metadata?: Record<string, any>;
  active?: boolean;
}

export interface ControllerDto {
  id: string;
  room_id: string;
  name: string;
  type: ControllerType;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  hardware_version?: string;
  health_status: HealthStatus;
  last_heartbeat?: Date;
  metadata?: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ControllerHeartbeatDto {
  controller_id: string;
  uptime_seconds: number;
  free_memory_bytes?: number;
  cpu_usage_percent?: number;
  temperature_celsius?: number;
  metadata?: Record<string, any>;
}
