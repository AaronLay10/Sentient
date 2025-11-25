import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RegisterControllerDto } from './dto/register-controller.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class ControllersService {
  private redisPublisher: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.redisPublisher = new Redis(redisUrl);
  }

  async findAll() {
    const controllers = await this.prisma.controller.findMany({
      orderBy: { friendly_name: 'asc' }
    });

    // Compute status based on last_seen
    const now = new Date();
    return controllers.map(controller => {
      let status: 'online' | 'offline' | 'warning' | 'error' = 'offline';

      if (!controller.last_seen) {
        // No last_seen = waiting (will be shown as grey in frontend)
        status = 'offline'; // Frontend will convert null last_seen to 'waiting'
      } else {
        const timeSinceLastSeen = now.getTime() - controller.last_seen.getTime();
        const heartbeatInterval = controller.heartbeat_interval_ms || 30000; // Default 30s

        if (timeSinceLastSeen < heartbeatInterval * 2) {
          status = 'online';
        } else if (timeSinceLastSeen < heartbeatInterval * 5) {
          status = 'warning';
        } else {
          status = 'offline';
        }
      }

      return {
        id: controller.id,
        friendly_name: controller.friendly_name,
        controller_type: controller.controller_type,
        hardware_type: controller.hardware_type,
        firmware_version: controller.firmware_version,
        ip_address: controller.ip_address,
        status,
        device_count: controller.device_count,
        pending_devices: controller.pending_devices,
        heartbeat_interval_ms: controller.heartbeat_interval_ms,
        last_seen: controller.last_seen?.toISOString(),
        created_at: controller.created_at.toISOString(),
        assigned_devices: controller.device_count || 0,
        last_heartbeat: controller.last_seen?.toISOString(),
      };
    });
  }

  async register(dto: RegisterControllerDto) {
    // Try to find room by ID first, then by name (case-insensitive)
    let room = await this.prisma.room.findUnique({
      where: { id: dto.room_id },
      select: { id: true, clientId: true }
    });

    if (!room) {
      room = await this.prisma.room.findFirst({
        where: { name: { equals: dto.room_id, mode: 'insensitive' } },
        select: { id: true, clientId: true }
      });
    }

    if (!room) {
      throw new BadRequestException(`Room not found: ${dto.room_id}`);
    }

    const updateData = {
      controller_type: dto.controller_type,
      friendly_name: dto.friendly_name ?? dto.controller_id,
      description: dto.description,
      hardware_type: dto.hardware_type,
      hardware_version: dto.hardware_version,
      firmware_version: dto.firmware_version,
      ip_address: dto.ip_address,
      mac_address: dto.mac_address,
      heartbeat_interval_ms: dto.heartbeat_interval_ms,
      device_count: dto.device_count,
      pending_devices: dto.device_count ?? undefined,
      capability_manifest: dto.capability_manifest as any ?? undefined,
      last_seen: new Date(), // Update last_seen on registration
    };

    const createData = {
      id: dto.controller_id,
      roomId: room.id,
      clientId: room.clientId,
      ...updateData
    };

    const controller = await this.prisma.controller.upsert({
      where: { id: dto.controller_id },
      update: updateData,
      create: createData
    });

    return { controller_id: controller.id, status: 'registered' };
  }

  async requestStatus(controllerId: string) {
    console.log(`📋 Status request for controller: ${controllerId}`);

    const controller = await this.prisma.controller.findUnique({
      where: { id: controllerId },
      include: { room: true }
    });

    if (!controller) {
      throw new NotFoundException(`Controller ${controllerId} not found`);
    }

    // Use room name (lowercase) for MQTT topic, not the UUID
    const roomName = controller.room?.name?.toLowerCase() || controller.roomId;

    // Publish status request event to Redis
    const requestEvent = {
      event_type: 'status_request',
      controller_id: controllerId,
      room_id: roomName,
      timestamp: new Date().toISOString()
    };

    await this.redisPublisher.publish(
      'sentient:commands:status_request',
      JSON.stringify(requestEvent)
    );

    console.log(`✅ Published status request to Redis for ${controllerId}`);

    return { success: true, controller_id: controllerId, message: 'Status request sent' };
  }
}
