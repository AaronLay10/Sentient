import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesPublicController } from './devices-public.controller';
import { DevicesService } from './devices.service';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@Module({
  controllers: [DevicesController, DevicesPublicController],
  providers: [DevicesService, InternalAuthGuard]
})
export class DevicesModule {}
