import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterControllerDto } from './dto/register-controller.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ControllersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterControllerDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.room_id },
      select: { id: true, tenantId: true }
    });
    if (!room) {
      throw new BadRequestException('Room not found');
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
      capability_manifest: dto.capability_manifest as any ?? undefined
    };

    const createData = {
      id: dto.controller_id,
      roomId: room.id,
      tenantId: room.tenantId,
      ...updateData
    };

    const controller = await this.prisma.controller.upsert({
      where: { id: dto.controller_id },
      update: updateData,
      create: createData
    });

    return { controller_id: controller.id, status: 'registered' };
  }
}
