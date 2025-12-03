import { EventType } from '../enums';
import { DomainEvent } from './base.event';

export interface AudioCuePlayEvent extends DomainEvent {
  type: EventType.AUDIO_CUE_PLAY;
  room_id: string;
  session_id?: string;
  data: {
    cue_id: string;
    triggered_by?: 'scene' | 'puzzle' | 'gm' | 'system';
    source_id?: string; // scene_id, puzzle_id, etc.
  };
}

export interface AudioCueStopEvent extends DomainEvent {
  type: EventType.AUDIO_CUE_STOP;
  room_id: string;
  session_id?: string;
  data: {
    cue_id: string;
  };
}

export interface AudioHotkeyPlayEvent extends DomainEvent {
  type: EventType.AUDIO_HOTKEY_PLAY;
  room_id: string;
  session_id?: string;
  data: {
    hotkey_id: string;
    triggered_by?: 'scene' | 'puzzle' | 'gm' | 'system';
  };
}

export interface AudioHotkeyOnEvent extends DomainEvent {
  type: EventType.AUDIO_HOTKEY_ON;
  room_id: string;
  session_id?: string;
  data: {
    hotkey_id: string;
  };
}

export interface AudioHotkeyOffEvent extends DomainEvent {
  type: EventType.AUDIO_HOTKEY_OFF;
  room_id: string;
  session_id?: string;
  data: {
    hotkey_id: string;
  };
}

export interface AudioStopAllEvent extends DomainEvent {
  type: EventType.AUDIO_STOP_ALL;
  room_id: string;
  session_id?: string;
  data: {
    initiated_by?: string;
    reason?: string;
  };
}

export interface AudioFadeAllEvent extends DomainEvent {
  type: EventType.AUDIO_FADE_ALL;
  room_id: string;
  session_id?: string;
  data: {
    initiated_by?: string;
    reason?: string;
  };
}

export interface AudioSetMasterVolumeEvent extends DomainEvent {
  type: EventType.AUDIO_SET_MASTER_VOLUME;
  room_id: string;
  session_id?: string;
  data: {
    level: number; // 0.0 - 1.0
    initiated_by?: string;
  };
}

export type AudioEvent =
  | AudioCuePlayEvent
  | AudioCueStopEvent
  | AudioHotkeyPlayEvent
  | AudioHotkeyOnEvent
  | AudioHotkeyOffEvent
  | AudioStopAllEvent
  | AudioFadeAllEvent
  | AudioSetMasterVolumeEvent;
