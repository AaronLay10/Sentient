import { config } from 'dotenv';
import type { LogLevel } from '@sentient/shared-logging';

config();

export interface AudioGatewayConfig {
  NODE_ENV: string;
  LOG_LEVEL: LogLevel;
  REDIS_URL: string;

  // SCS Audio Server configuration
  SCS_HOST: string;
  SCS_PORT: number;

  // Local UDP port for sending OSC messages
  OSC_LOCAL_PORT: number;
}

export function loadAudioGatewayConfig(): AudioGatewayConfig {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: (process.env.LOG_LEVEL as LogLevel) || 'info',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // SCS Audio Server
    SCS_HOST: process.env.SCS_HOST || 'audio.sentientengine.ai',
    SCS_PORT: parseInt(process.env.SCS_PORT || '5000', 10),

    // Local port for UDP socket
    OSC_LOCAL_PORT: parseInt(process.env.OSC_LOCAL_PORT || '0', 10), // 0 = auto-assign
  };
}
