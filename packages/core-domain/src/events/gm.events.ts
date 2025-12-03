import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface HintUsedEvent extends DomainEvent {
  type: EventType.HINT_USED;
  session_id: string;
  room_id: string;
  data: {
    hint_number?: number;
    hint_text?: string;
    delivered_by?: 'audio' | 'video' | 'text' | 'in_person';
    initiated_by: string;
  };
}

export interface ManualOverrideEvent extends DomainEvent {
  type: EventType.MANUAL_OVERRIDE;
  session_id?: string;
  room_id: string;
  data: {
    target_type: 'device' | 'puzzle' | 'scene' | 'effect';
    target_id: string;
    action: string;
    parameters?: Record<string, any>;
    initiated_by: string;
    reason?: string;
  };
}

export interface GMCommandEvent extends DomainEvent {
  type: EventType.GM_COMMAND;
  session_id?: string;
  room_id: string;
  data: {
    command: string;
    parameters?: Record<string, any>;
    initiated_by: string;
  };
}
