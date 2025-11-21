import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface DeviceStateChangedEvent extends DomainEvent {
  type: EventType.DEVICE_STATE_CHANGED;
  device_id: string;
  controller_id: string;
  data: {
    previous_state?: Record<string, any>;
    new_state: Record<string, any>;
  };
}

export interface DeviceOnlineEvent extends DomainEvent {
  type: EventType.DEVICE_ONLINE;
  device_id: string;
  controller_id: string;
}

export interface DeviceOfflineEvent extends DomainEvent {
  type: EventType.DEVICE_OFFLINE;
  device_id: string;
  controller_id: string;
}

export interface DeviceErrorEvent extends DomainEvent {
  type: EventType.DEVICE_ERROR;
  device_id: string;
  controller_id: string;
  data: {
    error_code?: string;
    error_message: string;
    error_details?: Record<string, any>;
  };
}
