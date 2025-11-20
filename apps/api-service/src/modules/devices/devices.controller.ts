import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('internal/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(@Body() body: RegisterDeviceDto) {
    return this.devicesService.register(body);
  }
}
