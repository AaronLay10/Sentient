import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

interface DomainEvent {
  event_id: string;
  type: string;
  timestamp: string;
  room_id?: string;
  session_id?: string;
  controller_id?: string;
  device_id?: string;
  payload?: any;
}

@Injectable()
export class HeartbeatEventHandlerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatEventHandlerService.name);
  private redisSubscriber: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redisSubscriber = new Redis(redisUrl);
  }

  async onModuleInit() {
    this.logger.log('Subscribing to controller heartbeat events...');

    await this.redisSubscriber.subscribe('sentient:events:domain', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to domain events', err);
      } else {
        this.logger.log('Successfully subscribed to domain events channel');
      }
    });

    this.redisSubscriber.on('message', async (channel, message) => {
      try {
        const event: DomainEvent = JSON.parse(message);

        // Handle controller heartbeat events
        if (event.type === 'controller_heartbeat' && event.controller_id) {
          await this.handleHeartbeat(event.controller_id);
        }

        // Handle device state change events
        if (event.type === 'device_state_changed' && event.device_id) {
          await this.handleDeviceStateChange(event);
        }
      } catch (error) {
        this.logger.error('Error processing domain event:', error);
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Unsubscribing from events and closing Redis connection');
    await this.redisSubscriber.quit();
  }

  private async handleHeartbeat(controllerId: string): Promise<void> {
    try {
      await this.prisma.controller.update({
        where: { id: controllerId },
        data: { last_seen: new Date() },
      });

      this.logger.debug(`Updated last_seen for controller: ${controllerId}`);
    } catch (error) {
      this.logger.error(`Failed to update last_seen for ${controllerId}:`, error);
    }
  }

  private async handleDeviceStateChange(event: DomainEvent): Promise<void> {
    try {
      const deviceId = event.device_id;
      const newState = event.payload?.new_state;

      if (!newState) {
        this.logger.warn(`Device state change event missing payload.new_state`, { event_id: event.event_id });
        return;
      }

      // Extract the state value (could be boolean 'power' or numeric 'state')
      const stateValue = newState.power !== undefined ? newState.power :
                        (newState.state !== undefined ? Boolean(newState.state) : null);

      if (stateValue === null) {
        this.logger.warn(`Could not extract state value from payload`, {
          event_id: event.event_id,
          payload: newState
        });
        return;
      }

      // Get current device to merge with existing properties
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        select: { properties: true }
      });

      const currentProperties = (device?.properties as Record<string, any>) || {};

      // Update device state in database (store in properties JSON field)
      await this.prisma.device.update({
        where: { id: deviceId },
        data: {
          properties: {
            ...currentProperties,
            state: stateValue,
            last_state_update: new Date(event.timestamp).toISOString(),
          },
          last_seen: new Date(event.timestamp),
        },
      });

      this.logger.debug(`Updated device state: ${deviceId} -> ${stateValue ? 'ON' : 'OFF'}`);
    } catch (error) {
      this.logger.error(`Failed to update device state for ${event.device_id}:`, error);
    }
  }
}
