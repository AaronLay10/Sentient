import {
  EventType,
  DomainEvent,
  AudioCuePlayEvent,
  AudioCueStopEvent,
  AudioHotkeyPlayEvent,
  AudioHotkeyOnEvent,
  AudioHotkeyOffEvent,
  AudioStopAllEvent,
  AudioFadeAllEvent,
  AudioSetMasterVolumeEvent,
} from '@sentient/core-domain';
import { Logger } from '@sentient/shared-logging';
import { OscClient } from '../../infrastructure/osc/osc-client';

/**
 * Handles audio domain events and translates them to OSC commands
 * for the SCS Audio Server.
 */
export class AudioEventHandler {
  constructor(
    private readonly oscClient: OscClient,
    private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.AUDIO_CUE_PLAY:
        this.handleCuePlay(event as AudioCuePlayEvent);
        break;
      case EventType.AUDIO_CUE_STOP:
        this.handleCueStop(event as AudioCueStopEvent);
        break;
      case EventType.AUDIO_HOTKEY_PLAY:
        this.handleHotkeyPlay(event as AudioHotkeyPlayEvent);
        break;
      case EventType.AUDIO_HOTKEY_ON:
        this.handleHotkeyOn(event as AudioHotkeyOnEvent);
        break;
      case EventType.AUDIO_HOTKEY_OFF:
        this.handleHotkeyOff(event as AudioHotkeyOffEvent);
        break;
      case EventType.AUDIO_STOP_ALL:
        this.handleStopAll(event as AudioStopAllEvent);
        break;
      case EventType.AUDIO_FADE_ALL:
        this.handleFadeAll(event as AudioFadeAllEvent);
        break;
      case EventType.AUDIO_SET_MASTER_VOLUME:
        this.handleSetMasterVolume(event as AudioSetMasterVolumeEvent);
        break;
      default:
        this.logger.debug('Ignoring non-audio event', { type: event.type });
    }
  }

  private handleCuePlay(event: AudioCuePlayEvent): void {
    const { cue_id, triggered_by, source_id } = event.data;

    this.logger.info('Playing audio cue', {
      cue_id,
      room_id: event.room_id,
      triggered_by,
      source_id,
    });

    this.oscClient.playCue(cue_id);
  }

  private handleCueStop(event: AudioCueStopEvent): void {
    const { cue_id } = event.data;

    this.logger.info('Stopping audio cue', {
      cue_id,
      room_id: event.room_id,
    });

    this.oscClient.stopCue(cue_id);
  }

  private handleHotkeyPlay(event: AudioHotkeyPlayEvent): void {
    const { hotkey_id, triggered_by } = event.data;

    this.logger.info('Playing audio hotkey', {
      hotkey_id,
      room_id: event.room_id,
      triggered_by,
    });

    this.oscClient.playHotkey(hotkey_id);
  }

  private handleHotkeyOn(event: AudioHotkeyOnEvent): void {
    const { hotkey_id } = event.data;

    this.logger.info('Turning on audio hotkey', {
      hotkey_id,
      room_id: event.room_id,
    });

    this.oscClient.hotkeyOn(hotkey_id);
  }

  private handleHotkeyOff(event: AudioHotkeyOffEvent): void {
    const { hotkey_id } = event.data;

    this.logger.info('Turning off audio hotkey', {
      hotkey_id,
      room_id: event.room_id,
    });

    this.oscClient.hotkeyOff(hotkey_id);
  }

  private handleStopAll(event: AudioStopAllEvent): void {
    const { initiated_by, reason } = event.data;

    this.logger.info('Stopping all audio', {
      room_id: event.room_id,
      initiated_by,
      reason,
    });

    this.oscClient.stopAll();
  }

  private handleFadeAll(event: AudioFadeAllEvent): void {
    const { initiated_by, reason } = event.data;

    this.logger.info('Fading all audio', {
      room_id: event.room_id,
      initiated_by,
      reason,
    });

    this.oscClient.fadeAll();
  }

  private handleSetMasterVolume(event: AudioSetMasterVolumeEvent): void {
    const { level, initiated_by } = event.data;

    this.logger.info('Setting master volume', {
      level,
      room_id: event.room_id,
      initiated_by,
    });

    this.oscClient.setMasterFader(level);
  }
}
