import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface SessionCreatedEvent extends DomainEvent {
  type: EventType.SESSION_CREATED;
  session_id: string;
  room_id: string;
  data: {
    team_name?: string;
    team_size?: number;
  };
}

export interface SessionStartedEvent extends DomainEvent {
  type: EventType.SESSION_STARTED;
  session_id: string;
  room_id: string;
}

export interface SessionPausedEvent extends DomainEvent {
  type: EventType.SESSION_PAUSED;
  session_id: string;
  room_id: string;
  data: {
    initiated_by: string;
    reason?: string;
  };
}

export interface SessionResumedEvent extends DomainEvent {
  type: EventType.SESSION_RESUMED;
  session_id: string;
  room_id: string;
  data: {
    initiated_by: string;
  };
}

export interface SessionCompletedEvent extends DomainEvent {
  type: EventType.SESSION_COMPLETED;
  session_id: string;
  room_id: string;
  data: {
    duration_seconds: number;
    hints_used: number;
    completed: boolean;
  };
}

export interface SessionAbandonedEvent extends DomainEvent {
  type: EventType.SESSION_ABANDONED;
  session_id: string;
  room_id: string;
  data: {
    reason?: string;
    initiated_by?: string;
  };
}
