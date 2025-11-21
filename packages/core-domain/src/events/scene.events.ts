import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface SceneStartedEvent extends DomainEvent {
  type: EventType.SCENE_STARTED;
  scene_id: string;
  session_id: string;
  room_id: string;
}

export interface SceneAdvancedEvent extends DomainEvent {
  type: EventType.SCENE_ADVANCED;
  scene_id: string;
  session_id: string;
  room_id: string;
  data: {
    from_scene_id?: string;
    triggered_by?: string;
  };
}

export interface SceneCompletedEvent extends DomainEvent {
  type: EventType.SCENE_COMPLETED;
  scene_id: string;
  session_id: string;
  room_id: string;
  data: {
    duration_seconds: number;
  };
}
