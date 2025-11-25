import { Module } from '@nestjs/common';
import { KioskController } from './kiosk.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [KioskController],
})
export class KioskModule {}
