import { createLogger, LogLevel } from '@sentient/shared-logging';
import { EventSubscriber, RedisChannelBuilder } from '@sentient/shared-messaging';
import { SentientWebSocketServer } from './websocket/websocket-server';
import { RedisSubscriberAdapter } from './redis-adapter';
import Redis from 'ioredis';
import { createServer, IncomingMessage, ServerResponse } from 'http';

// Load package.json for version
const packageJson = require('../package.json');

async function bootstrap() {
  const logger = createLogger({
    service: 'realtime-gateway',
    level: (process.env.LOG_LEVEL || 'info') as LogLevel,
    pretty: process.env.NODE_ENV === 'development',
  });

  logger.info('Starting Realtime Gateway');

  const wsPort = parseInt(process.env.WS_PORT || '3002');
  const healthPort = parseInt(process.env.HEALTH_PORT || '3003');
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

  // Initialize WebSocket server
  const wsServer = new SentientWebSocketServer(wsPort, logger.child({ component: 'ws-server' }));

  // Initialize Redis subscriber
  const redisInstance = new Redis(redisUrl);
  const redisSubscriber = new RedisSubscriberAdapter(redisInstance);
  const eventSubscriber = new EventSubscriber(redisSubscriber);

  // Track Redis connection status
  let redisConnected = false;
  redisInstance.on('connect', () => {
    redisConnected = true;
    logger.info('Redis connected');
  });
  redisInstance.on('error', (err) => {
    redisConnected = false;
    logger.error('Redis connection error', err);
  });
  redisInstance.on('close', () => {
    redisConnected = false;
    logger.warn('Redis connection closed');
  });

  // Create HTTP health check server
  const healthServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' && req.method === 'GET') {
      const stats = wsServer.getStats();
      const health = {
        status: redisConnected ? 'ok' : 'degraded',
        service: 'realtime-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: {
          connected: redisConnected,
          url: redisUrl.replace(/\/\/.*@/, '//*****@'), // Mask credentials
        },
        websocket: {
          port: wsPort,
          clients: stats.total_clients,
          rooms: stats.rooms.length,
        },
      };

      const statusCode = redisConnected ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else if (req.url === '/health/version' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'realtime-gateway',
        version: packageJson.version,
        node: process.version,
        uptime: process.uptime(),
      }));
    } else if (req.url === '/ready' && req.method === 'GET') {
      // Readiness probe - only ready if Redis is connected
      if (redisConnected) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: true }));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: false, reason: 'Redis not connected' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  healthServer.listen(healthPort, () => {
    logger.info('Health check server started', { port: healthPort });
  });

  // Subscribe to all domain events and broadcast to WebSocket clients
  await eventSubscriber.subscribeToDomainEvents(async (event) => {
    const isAck = event.metadata?.is_acknowledgement === true;
    
    logger.debug('Received domain event', { 
      type: event.type, 
      event_id: event.event_id,
      device_id: event.device_id,
      is_acknowledgement: isAck
    });
    
    if (isAck) {
      logger.info('🔔 Broadcasting ACK event', {
        device_id: event.device_id,
        room_id: event.room_id,
        event_id: event.event_id
      });
    }

    // Broadcast to all clients in the room
    if (event.room_id) {
      wsServer.broadcastToRoom(event.room_id, {
        type: 'event_notification',
        room_id: event.room_id,
        session_id: event.session_id,
        data: event,
        timestamp: new Date(),
      });
    }

    // Also broadcast globally
    wsServer.broadcastToAll({
      type: 'event_notification',
      data: event,
      timestamp: new Date(),
    });
  });

  logger.info('Realtime Gateway started successfully', { ws_port: wsPort });

  // Stats logging every 30 seconds
  setInterval(() => {
    const stats = wsServer.getStats();
    logger.info('WebSocket stats', stats);
  }, 30000);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Realtime Gateway');

    // Close health server first
    await new Promise<void>((resolve) => {
      healthServer.close(() => {
        logger.info('Health server closed');
        resolve();
      });
    });

    await wsServer.close();
    await redisInstance.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start Realtime Gateway:', error);
  process.exit(1);
});
