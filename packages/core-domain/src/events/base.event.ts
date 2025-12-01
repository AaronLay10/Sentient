import { EventType } from '../enums';

export interface DomainEvent {
  event_id: string;
  type: EventType;
  timestamp: Date;
  session_id?: string;
  room_id?: string;
  tenant_id?: string;
  controller_id?: string;
  device_id?: string;
  puzzle_id?: string;
  scene_id?: string;
  data?: Record<string, any>;
  payload?: Record<string, any>;
  metadata?: {
    source?: string;
    mqtt_topic?: string;
    is_acknowledgement?: boolean;
    is_full_status?: boolean;
    [key: string]: any;
  };
}
