import { Module } from '@nestjs/common';
import { ControllersController } from './controllers.controller';
import { ControllersPublicController } from './controllers-public.controller';
import { ControllersService } from './controllers.service';
import { InternalAuthGuard } from '../../shared/internal-auth.guard';

@Module({
  controllers: [ControllersController, ControllersPublicController],
  providers: [ControllersService, InternalAuthGuard]
})
export class ControllersModule {}
