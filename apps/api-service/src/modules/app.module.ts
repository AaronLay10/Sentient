import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import * as Joi from 'joi';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from './database.module';
import { RedisModule } from './redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { VenuesModule } from './venues/venues.module';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from '../auth/auth.module';
import { ControllersModule } from './controllers/controllers.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../../../.env')
      ],
      validationSchema: Joi.object({
        API_PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().uri(),
        POSTGRES_HOST: Joi.string().default('127.0.0.1'),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        MQTT_USERNAME: Joi.string().required(),
        MQTT_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.alternatives().try(Joi.string(), Joi.number()).default('1d')
      })
    }),
    PrismaModule,
    AuthModule,
    DatabaseModule,
    RedisModule,
    TenantsModule,
    VenuesModule,
    RoomsModule,
    ControllersModule,
    DevicesModule
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
