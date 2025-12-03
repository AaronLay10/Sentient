import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Redis from 'ioredis';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private redisPublisher: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redisPublisher = new Redis(redisUrl);
  }

  async findAll() {
    const devices = await this.prisma.device.findMany({
      include: {
        actions: true,
        controller: true
      },
      orderBy: { friendly_name: 'asc' }
    });

    return devices.map(device => ({
      id: device.id,
      friendly_name: device.friendly_name,
      device_type: device.device_type,
      device_category: device.device_category,
      action_type: device.action_type,
      controller_id: device.controllerId,
      status: 'operational' as const,
      properties: device.properties,
      actions: device.actions.map(action => ({
        action_id: action.action_id,
        mqtt_topic: action.mqtt_topic,
        friendly_name: action.action_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      })),
      created_at: device.created_at.toISOString(),
    }));
  }

  async register(dto: RegisterDeviceDto) {
    const controller = await this.prisma.controller.findUnique({
      where: { id: dto.controller_id },
      select: { id: true, clientId: true, roomId: true, pending_devices: true }
    });
    if (!controller) {
      throw new BadRequestException('Controller not found');
    }

    // Only check room_id if it was provided in the DTO
    if (dto.room_id && controller.roomId !== dto.room_id) {
      throw new BadRequestException('Room mismatch for controller');
    }

    const device = await this.prisma.device.upsert({
      where: { id: dto.device_id },
      update: {
        friendly_name: dto.friendly_name ?? dto.device_id,
        device_type: dto.device_type,
        device_category: dto.device_category,
        action_type: dto.action_type,
        properties: (dto.properties ?? undefined) as any
      },
      create: {
        id: dto.device_id,
        controllerId: controller.id,
        clientId: controller.clientId,
        roomId: controller.roomId,
        friendly_name: dto.friendly_name ?? dto.device_id,
        device_type: dto.device_type,
        device_category: dto.device_category,
        action_type: dto.action_type,
        properties: (dto.properties ?? undefined) as any
      }
    });

    // Upsert actions from mqtt_topics
    if (dto.mqtt_topics && dto.mqtt_topics.length > 0) {
      for (const t of dto.mqtt_topics) {
        const topic = t.topic;
        if (!topic) continue;
        const segments = topic.split('/');
        const actionId = segments[segments.length - 1];
        await this.prisma.deviceAction.upsert({
          where: { deviceId_action_id: { deviceId: device.id, action_id: actionId } },
          update: { mqtt_topic: topic },
          create: {
            deviceId: device.id,
            action_id: actionId,
            mqtt_topic: topic
          }
        });
      }
    }

    // Decrement pending_devices if set
    if (controller.pending_devices && controller.pending_devices > 0) {
      await this.prisma.controller.update({
        where: { id: controller.id },
        data: { pending_devices: { decrement: 1 } }
      });
    }

    return { device_id: device.id, controller_id: controller.id, status: 'registered' };
  }

  async listByController(controllerId: string) {
    const devices = await this.prisma.device.findMany({
      where: { controllerId },
      include: {
        actions: true
      },
      orderBy: { created_at: 'asc' }
    });

    return devices;
  }

  async getById(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        actions: true,
        controller: true
      }
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return device;
  }

  async getDeviceActions(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        actions: true
      }
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return {
      device_id: deviceId,
      actions: device.actions.map(action => ({
        action_id: action.action_id,
        friendly_name: action.friendly_name || action.action_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        mqtt_topic: action.mqtt_topic
      }))
    };
  }

  async controlDevice(deviceId: string, state: boolean) {
    this.logger.log(`Control command received: ${deviceId} -> ${state ? 'ON' : 'OFF'}`);

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        controller: true,
        actions: true,
        room: true
      }
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    // Use room_id for MQTT topic (stable identifier), fallback to room name
    const roomIdentifier = device.room?.room_id || device.room?.name?.toLowerCase() || device.roomId;
    this.logger.debug(`Device found: ${device.id}, Controller: ${device.controllerId}, Room: ${roomIdentifier}`);

    // Publish device command event to Redis
    const commandEvent = {
      event_type: 'device_command',
      controller_id: device.controllerId,
      device_id: deviceId,
      room_id: roomIdentifier,
      command: {
        device_id: deviceId,
        state: state
      },
      timestamp: new Date().toISOString()
    };

    await this.redisPublisher.publish(
      'sentient:commands:device',
      JSON.stringify(commandEvent)
    );

    this.logger.log(`Published command to Redis: sentient:commands:device`);

    return { success: true, device_id: deviceId, state };
  }

  // Generic command sender for lighting and other advanced controls
  async sendCommand(deviceId: string, command: string, payload?: Record<string, any>) {
    this.logger.log(`Send command: ${deviceId} -> ${command}`, payload ? JSON.stringify(payload) : '');

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        controller: true,
        room: true
      }
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    // Use room_id for MQTT topic (stable identifier), fallback to room name
    const roomIdentifier = device.room?.room_id || device.room?.name?.toLowerCase() || device.roomId;
    this.logger.debug(`Device found: ${device.id}, Controller: ${device.controllerId}, Room: ${roomIdentifier}`);

    // Publish generic command event to Redis
    const commandEvent = {
      event_type: 'device_command_generic',
      controller_id: device.controllerId,
      device_id: deviceId,
      room_id: roomIdentifier,
      command: command,
      payload: payload || {},
      timestamp: new Date().toISOString()
    };

    await this.redisPublisher.publish(
      'sentient:commands:device_generic',
      JSON.stringify(commandEvent)
    );

    this.logger.log(`Published generic command to Redis: sentient:commands:device_generic`);

    return { success: true, device_id: deviceId, command, payload };
  }
}
