import { ControllerType, HealthStatus } from '../enums';

export interface Controller {
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

export interface ControllerHeartbeat {
  controller_id: string;
  timestamp: Date;
  uptime_seconds: number;
  free_memory_bytes?: number;
  cpu_usage_percent?: number;
  temperature_celsius?: number;
  metadata?: Record<string, any>;
}
