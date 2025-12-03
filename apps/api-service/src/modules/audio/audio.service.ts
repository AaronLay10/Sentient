import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AudioCommandDto } from './dto/audio-command.dto';

// Maps UI command names to EventType values
const COMMAND_TO_EVENT_TYPE: Record<string, string> = {
  play: 'audio_cue_play',
  stop: 'audio_cue_stop',
  hotkey: 'audio_hotkey_play',
  hotkey_on: 'audio_hotkey_on',
  hotkey_off: 'audio_hotkey_off',
  stop_all: 'audio_stop_all',
  fade_all: 'audio_fade_all',
};

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private redisPublisher: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redisPublisher = new Redis(redisUrl);
  }

  async sendCommand(dto: AudioCommandDto): Promise<{ success: boolean }> {
    const eventType = COMMAND_TO_EVENT_TYPE[dto.command];

    if (!eventType) {
      this.logger.warn(`Unknown audio command: ${dto.command}`);
      return { success: false };
    }

    this.logger.log(`Audio command: ${dto.command} -> cue ${dto.cue_id} for room ${dto.room_id}`);

    // Build the domain event based on command type
    const isHotkeyCommand = dto.command.startsWith('hotkey');
    const isCueCommand = dto.command === 'play' || dto.command === 'stop';
    const isGlobalCommand = dto.command === 'stop_all' || dto.command === 'fade_all';

    const eventData: Record<string, any> = {
      triggered_by: dto.triggered_by || 'scene',
    };

    if (isCueCommand) {
      eventData.cue_id = dto.cue_id;
    } else if (isHotkeyCommand) {
      eventData.hotkey_id = dto.cue_id;
    } else if (isGlobalCommand) {
      eventData.initiated_by = dto.triggered_by || 'system';
    }

    const domainEvent = {
      event_id: uuidv4(),
      type: eventType,
      room_id: dto.room_id,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    // Publish to the domain events channel (audio-gateway listens here)
    await this.redisPublisher.publish(
      'sentient:events:domain',
      JSON.stringify(domainEvent)
    );

    this.logger.log(`Published audio event to Redis: ${eventType} (cue: ${dto.cue_id})`);

    return { success: true };
  }
}
