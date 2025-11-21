import { EventType } from '../enums';

export interface DomainEvent {
  event_id: string;
  type: EventType;
  timestamp: Date;
  session_id?: string;
  room_id?: string;
  controller_id?: string;
  device_id?: string;
  puzzle_id?: string;
  scene_id?: string;
  data: Record<string, any>;
}
