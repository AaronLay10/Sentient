import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

const packageJson = require('../../package.json');

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return { status: 'ok' };
  }

  @Get('version')
  getVersion() {
    return {
      service: 'api-service',
      version: packageJson.version,
      node: process.version,
      uptime: process.uptime(),
    };
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
