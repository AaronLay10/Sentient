import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface ControllerRegisteredEvent extends DomainEvent {
  type: EventType.CONTROLLER_REGISTERED;
  controller_id: string;
  room_id: string;
  data: {
    controller_type: string;
    firmware_version?: string;
    ip_address?: string;
    mac_address?: string;
  };
}

export interface ControllerOnlineEvent extends DomainEvent {
  type: EventType.CONTROLLER_ONLINE;
  controller_id: string;
  room_id: string;
}

export interface ControllerOfflineEvent extends DomainEvent {
  type: EventType.CONTROLLER_OFFLINE;
  controller_id: string;
  room_id: string;
  data: {
    last_seen?: Date;
    reason?: string;
  };
}

export interface ControllerHeartbeatEvent extends DomainEvent {
  type: EventType.CONTROLLER_HEARTBEAT;
  controller_id: string;
  room_id: string;
  data: {
    uptime_seconds: number;
    free_memory_bytes?: number;
    cpu_usage_percent?: number;
    temperature_celsius?: number;
  };
}

export interface ControllerErrorEvent extends DomainEvent {
  type: EventType.CONTROLLER_ERROR;
  controller_id: string;
  room_id: string;
  data: {
    error_code?: string;
    error_message: string;
    error_details?: Record<string, any>;
  };
}
