import { Module } from '@nestjs/common';
import { ControllersController } from './controllers.controller';
import { ControllersService } from './controllers.service';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@Module({
  controllers: [ControllersController],
  providers: [ControllersService, InternalAuthGuard]
})
export class ControllersModule {}
