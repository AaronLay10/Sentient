import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('internal/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll() {
    return this.devicesService.findAll();
  }

  @Post('register')
  async register(@Body() body: RegisterDeviceDto) {
    return this.devicesService.register(body);
  }

  @Get('controller/:controllerId')
  async listByController(@Param('controllerId') controllerId: string) {
    return this.devicesService.listByController(controllerId);
  }

  @Get(':deviceId')
  async getById(@Param('deviceId') deviceId: string) {
    return this.devicesService.getById(deviceId);
  }

  @Get(':deviceId/actions')
  async getDeviceActions(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceActions(deviceId);
  }
}
