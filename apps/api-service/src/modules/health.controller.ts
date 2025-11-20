import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return { status: 'ok' };
  }

  @Get('dependencies')
  async getDependencies() {
    const [db, redis] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis()
    ]);
    return {
      status: db && redis ? 'ok' : 'degraded',
      database: db ? 'ok' : 'unreachable',
      redis: redis ? 'ok' : 'unreachable'
    };
  }
}
