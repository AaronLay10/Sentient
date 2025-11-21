import { EventType } from '../enums';

export interface Event {
  id: string;
  session_id?: string;
  room_id?: string;
  controller_id?: string;
  device_id?: string;
  puzzle_id?: string;
  scene_id?: string;
  type: EventType;
  data: Record<string, any>;
  timestamp: Date;
  created_at: Date;
}
