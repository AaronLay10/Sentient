import { loadAudioGatewayConfig } from './config/env.config';
import { createLogger } from '@sentient/shared-logging';
import { OscClient } from './infrastructure/osc/osc-client';
import { AudioEventHandler } from './application/handlers/audio-event.handler';
import { EventType } from '@sentient/core-domain';
import { REDIS_CHANNELS } from '@sentient/shared-messaging';
import Redis from 'ioredis';

async function bootstrap() {
  const config = loadAudioGatewayConfig();
  const logger = createLogger({
    service: 'audio-gateway',
    level: config.LOG_LEVEL,
    pretty: config.NODE_ENV === 'development',
  });

  logger.info('Starting Audio Gateway', {
    node_env: config.NODE_ENV,
    scs_host: config.SCS_HOST,
    scs_port: config.SCS_PORT,
    redis_url: config.REDIS_URL,
  });

  // Initialize OSC client for SCS Audio Server
  const oscClient = new OscClient(
    {
      remoteHost: config.SCS_HOST,
      remotePort: config.SCS_PORT,
      localPort: config.OSC_LOCAL_PORT,
    },
    logger.child({ component: 'osc-client' })
  );

  await oscClient.connect();

  // Initialize event handler
  const audioHandler = new AudioEventHandler(
    oscClient,
    logger.child({ component: 'audio-handler' })
  );

  // Audio event types to listen for
  const audioEvents = new Set([
    EventType.AUDIO_CUE_PLAY,
    EventType.AUDIO_CUE_STOP,
    EventType.AUDIO_HOTKEY_PLAY,
    EventType.AUDIO_HOTKEY_ON,
    EventType.AUDIO_HOTKEY_OFF,
    EventType.AUDIO_STOP_ALL,
    EventType.AUDIO_FADE_ALL,
    EventType.AUDIO_SET_MASTER_VOLUME,
  ]);

  // Connect to Redis for domain events
  const redis = new Redis(config.REDIS_URL);

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (error) => {
    logger.error('Redis connection error', error);
  });

  // Subscribe to domain events channel
  await redis.subscribe(REDIS_CHANNELS.DOMAIN_EVENTS);

  redis.on('message', async (channel, message) => {
    if (channel !== REDIS_CHANNELS.DOMAIN_EVENTS) return;

    try {
      const event = JSON.parse(message);

      // Only process audio events
      if (!audioEvents.has(event.type)) {
        return;
      }

      logger.debug('Received audio event', {
        type: event.type,
        event_id: event.event_id,
      });

      await audioHandler.handle(event);
    } catch (error) {
      logger.error('Error processing event', error as Error);
    }
  });

  logger.info('Audio Gateway started successfully', {
    audio_events_handled: audioEvents.size,
    scs_server: `${config.SCS_HOST}:${config.SCS_PORT}`,
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Audio Gateway');
    oscClient.disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start Audio Gateway:', error);
  process.exit(1);
});
