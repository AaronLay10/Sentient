import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface PuzzleStartedEvent extends DomainEvent {
  type: EventType.PUZZLE_STARTED;
  puzzle_id: string;
  session_id: string;
  room_id: string;
}

export interface PuzzleProgressEvent extends DomainEvent {
  type: EventType.PUZZLE_PROGRESS;
  puzzle_id: string;
  session_id: string;
  room_id: string;
  data: {
    progress: Record<string, any>;
    completion_percentage?: number;
  };
}

export interface PuzzleSolvedEvent extends DomainEvent {
  type: EventType.PUZZLE_SOLVED;
  puzzle_id: string;
  session_id: string;
  room_id: string;
  data: {
    duration_seconds: number;
    attempts: number;
  };
}

export interface PuzzleFailedEvent extends DomainEvent {
  type: EventType.PUZZLE_FAILED;
  puzzle_id: string;
  session_id: string;
  room_id: string;
  data: {
    reason?: string;
  };
}

export interface PuzzleResetEvent extends DomainEvent {
  type: EventType.PUZZLE_RESET;
  puzzle_id: string;
  session_id: string;
  room_id: string;
  data: {
    initiated_by?: string;
  };
}

export interface PuzzleSkippedEvent extends DomainEvent {
  type: EventType.PUZZLE_SKIPPED;
  puzzle_id: string;
  session_id: string;
  room_id: string;
  data: {
    initiated_by: string;
    reason?: string;
  };
}
