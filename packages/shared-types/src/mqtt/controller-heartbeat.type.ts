export interface ControllerHeartbeatPayload {
  v: number; // version
  type: 'controller_heartbeat';
  controller_id: string;
  uptime_seconds: number;
  free_memory_bytes?: number;
  cpu_usage_percent?: number;
  temperature_celsius?: number;
  device_count?: number;
  firmware_version?: string;
  timestamp: string;
}

export interface ControllerRegistrationPayload {
  v: number;
  type: 'controller_registration';
  controller_id: string;
  controller_type: string;
  room_id?: string;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  hardware_version?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
