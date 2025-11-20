import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDeviceDto) {
    const controller = await this.prisma.controller.findUnique({
      where: { id: dto.controller_id },
      select: { id: true, tenantId: true, roomId: true, pending_devices: true }
    });
    if (!controller) {
      throw new BadRequestException('Controller not found');
    }

    if (controller.roomId !== dto.room_id) {
      throw new BadRequestException('Room mismatch for controller');
    }

    const device = await this.prisma.device.upsert({
      where: { id: dto.device_id },
      update: {
        friendly_name: dto.device_id,
        device_type: dto.device_type,
        device_category: dto.device_category,
        properties: (dto.properties ?? undefined) as any
      },
      create: {
        id: dto.device_id,
        controllerId: controller.id,
        tenantId: controller.tenantId,
        roomId: controller.roomId,
        friendly_name: dto.device_id,
        device_type: dto.device_type,
        device_category: dto.device_category,
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
}
