import { loadOrchestratorConfig } from './config/env.config';
import { createLogger } from '@sentient/shared-logging';
import { RedisClient } from './infrastructure/redis/redis-client';
import { RedisSubscriberAdapter } from './infrastructure/redis/redis-adapter';
import { EventPublisher, EventSubscriber, RedisChannelBuilder } from '@sentient/shared-messaging';
import { InMemorySessionRepository } from './infrastructure/persistence/in-memory-session.repository';
import { PuzzleEvaluatorService } from './domain/services/puzzle-evaluator.service';
import { OrchestratorService } from './application/services/orchestrator.service';
import { DeviceEventHandler } from './application/handlers/device-event.handler';
import { EventType } from '@sentient/core-domain';

async function bootstrap() {
  // Load configuration
  const config = loadOrchestratorConfig();
  const logger = createLogger({
    service: 'orchestrator-service',
    level: config.LOG_LEVEL,
    pretty: config.NODE_ENV === 'development',
  });

  logger.info('Starting Orchestrator Service', {
    node_env: config.NODE_ENV,
    redis_url: config.REDIS_URL,
  });

  // Initialize infrastructure
  const redisClient = new RedisClient(config.REDIS_URL, logger);
  const publisher = redisClient.getPublisher();
  const subscriberAdapter = new RedisSubscriberAdapter(redisClient.getSubscriber());

  const eventPublisher = new EventPublisher(publisher);
  const eventSubscriber = new EventSubscriber(subscriberAdapter);

  // Initialize repositories
  const sessionRepository = new InMemorySessionRepository();

  // Initialize services
  const puzzleEvaluator = new PuzzleEvaluatorService();
  const orchestrator = new OrchestratorService(
    sessionRepository,
    puzzleEvaluator,
    eventPublisher,
    logger.child({ component: 'orchestrator' })
  );

  // Initialize handlers
  const deviceEventHandler = new DeviceEventHandler(
    orchestrator,
    logger.child({ component: 'device-handler' })
  );

  // Subscribe to domain events
  await eventSubscriber.subscribeToDomainEvents(async (event) => {
    logger.debug('Received domain event', { type: event.type, event_id: event.event_id });

    if (event.type === EventType.DEVICE_STATE_CHANGED) {
      await deviceEventHandler.handle(event as any);
    }
  });

  logger.info('Orchestrator Service started successfully');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Orchestrator Service');
    await redisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start Orchestrator Service:', error);
  process.exit(1);
});
