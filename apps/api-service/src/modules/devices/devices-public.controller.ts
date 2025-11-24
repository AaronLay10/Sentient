import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ControlDeviceDto } from './dto/control-device.dto';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesPublicController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll() {
    return this.devicesService.findAll();
  }

  @Get('controller/:controllerId')
  async listByController(@Param('controllerId') controllerId: string) {
    return this.devicesService.listByController(controllerId);
  }

  @Get(':deviceId')
  async getById(@Param('deviceId') deviceId: string) {
    return this.devicesService.getById(deviceId);
  }

  @Post(':deviceId/control')
  async controlDevice(
    @Param('deviceId') deviceId: string,
    @Body() dto: ControlDeviceDto
  ) {
    return this.devicesService.controlDevice(deviceId, dto.state);
  }
}
