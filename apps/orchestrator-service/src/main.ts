import { loadOrchestratorConfig } from './config/env.config';
import { createLogger } from '@sentient/shared-logging';
import { RedisClient } from './infrastructure/redis/redis-client';
import { RedisSubscriberAdapter } from './infrastructure/redis/redis-adapter';
import { EventPublisher, EventSubscriber, RedisChannelBuilder } from '@sentient/shared-messaging';
import { InMemorySessionRepository } from './infrastructure/persistence/in-memory-session.repository';
import { PuzzleEvaluatorService } from './domain/services/puzzle-evaluator.service';
import { OrchestratorService } from './application/services/orchestrator.service';
import { DeviceEventHandler } from './application/handlers/device-event.handler';
import { ControllerEventHandler } from './application/handlers/controller-event.handler';
import { SessionEventHandler } from './application/handlers/session-event.handler';
import { SafetyEventHandler } from './application/handlers/safety-event.handler';
import { GMEventHandler } from './application/handlers/gm-event.handler';
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

  const controllerEventHandler = new ControllerEventHandler(
    eventPublisher,
    logger.child({ component: 'controller-handler' })
  );

  const sessionEventHandler = new SessionEventHandler(
    orchestrator,
    eventPublisher,
    logger.child({ component: 'session-handler' })
  );

  const safetyEventHandler = new SafetyEventHandler(
    orchestrator,
    eventPublisher,
    logger.child({ component: 'safety-handler' })
  );

  const gmEventHandler = new GMEventHandler(
    orchestrator,
    eventPublisher,
    logger.child({ component: 'gm-handler' })
  );

  // Event type to handler routing
  const deviceEvents = new Set([
    EventType.DEVICE_STATE_CHANGED,
    EventType.DEVICE_ONLINE,
    EventType.DEVICE_OFFLINE,
    EventType.DEVICE_ERROR,
  ]);

  const controllerEvents = new Set([
    EventType.CONTROLLER_REGISTERED,
    EventType.CONTROLLER_ONLINE,
    EventType.CONTROLLER_OFFLINE,
    EventType.CONTROLLER_HEARTBEAT,
    EventType.CONTROLLER_ERROR,
  ]);

  const sessionEvents = new Set([
    EventType.SESSION_CREATED,
    EventType.SESSION_STARTED,
    EventType.SESSION_PAUSED,
    EventType.SESSION_RESUMED,
    EventType.SESSION_COMPLETED,
    EventType.SESSION_ABANDONED,
  ]);

  const safetyEvents = new Set([
    EventType.EMERGENCY_STOP_TRIGGERED,
    EventType.EMERGENCY_STOP_CLEARED,
    EventType.MAGLOCK_RELEASED,
    EventType.SAFETY_ALERT,
  ]);

  const gmEvents = new Set([
    EventType.HINT_USED,
    EventType.MANUAL_OVERRIDE,
    EventType.GM_COMMAND,
  ]);

  // Subscribe to domain events
  await eventSubscriber.subscribeToDomainEvents(async (event) => {
    logger.debug('Received domain event', { type: event.type, event_id: event.event_id });

    try {
      // Route to appropriate handler based on event type
      // SAFETY EVENTS ALWAYS PROCESSED FIRST
      if (safetyEvents.has(event.type)) {
        await safetyEventHandler.handle(event);
      } else if (deviceEvents.has(event.type)) {
        await deviceEventHandler.handle(event as any);
      } else if (controllerEvents.has(event.type)) {
        await controllerEventHandler.handle(event);
      } else if (sessionEvents.has(event.type)) {
        await sessionEventHandler.handle(event);
      } else if (gmEvents.has(event.type)) {
        await gmEventHandler.handle(event);
      } else {
        // Log unhandled event types for visibility
        logger.debug('Unhandled event type', { type: event.type, event_id: event.event_id });
      }
    } catch (error) {
      logger.error('Error processing event', error as Error, {
        event_type: event.type,
        event_id: event.event_id,
      });
    }
  });

  // Set up periodic controller health check
  const CONTROLLER_CHECK_INTERVAL_MS = 30000; // 30 seconds
  const CONTROLLER_TIMEOUT_MS = 90000; // 90 seconds (3 missed heartbeats at 30s interval)

  setInterval(() => {
    const staleControllers = controllerEventHandler.checkStaleControllers(CONTROLLER_TIMEOUT_MS);
    if (staleControllers.length > 0) {
      logger.warn('Stale controllers detected', { controller_ids: staleControllers });
    }
  }, CONTROLLER_CHECK_INTERVAL_MS);

  logger.info('Orchestrator Service started successfully', {
    handlers: ['device', 'controller', 'session', 'safety', 'gm'],
    event_types_handled: deviceEvents.size + controllerEvents.size + sessionEvents.size + safetyEvents.size + gmEvents.size,
  });

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
