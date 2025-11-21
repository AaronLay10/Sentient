import { DomainEvent } from '@sentient/core-domain';

export interface GMControlCommand {
  type: 'gm_command';
  command: string;
  room_id: string;
  session_id?: string;
  params?: Record<string, any>;
}

export interface GMHintCommand {
  type: 'use_hint';
  session_id: string;
  hint_text: string;
}

export interface GMSkipPuzzleCommand {
  type: 'skip_puzzle';
  session_id: string;
  puzzle_id: string;
}

export interface GMResetDeviceCommand {
  type: 'reset_device';
  device_id: string;
}

export interface GMEmergencyStopCommand {
  type: 'emergency_stop';
  room_id: string;
  reason?: string;
}

export interface GMEventNotification {
  type: 'event_notification';
  event: DomainEvent;
}
