import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface EmergencyStopTriggeredEvent extends DomainEvent {
  type: EventType.EMERGENCY_STOP_TRIGGERED;
  room_id: string;
  session_id?: string;
  data: {
    triggered_by?: string;
    trigger_source?: string;
    reason?: string;
  };
}

export interface EmergencyStopClearedEvent extends DomainEvent {
  type: EventType.EMERGENCY_STOP_CLEARED;
  room_id: string;
  session_id?: string;
  data: {
    cleared_by: string;
  };
}

export interface MaglockReleasedEvent extends DomainEvent {
  type: EventType.MAGLOCK_RELEASED;
  device_id: string;
  controller_id: string;
  room_id: string;
  session_id?: string;
  data: {
    reason: string;
    initiated_by?: string;
  };
}

export interface SafetyAlertEvent extends DomainEvent {
  type: EventType.SAFETY_ALERT;
  room_id: string;
  session_id?: string;
  data: {
    severity: 'warning' | 'critical';
    alert_type: string;
    message: string;
    source?: string;
  };
}
