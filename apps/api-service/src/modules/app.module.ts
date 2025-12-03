import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as path from 'path';
import * as Joi from 'joi';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from './database.module';
import { RedisModule } from './redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { VenuesModule } from './venues/venues.module';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from '../auth/auth.module';
import { ControllersModule } from './controllers/controllers.module';
import { DevicesModule } from './devices/devices.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { KioskModule } from './kiosk/kiosk.module';
import { ScenesModule } from './scenes/scenes.module';
import { PuzzlesModule } from './puzzles/puzzles.module';
import { AudioModule } from './audio/audio.module';
import { HeartbeatEventHandlerService } from '../events/heartbeat-event-handler.service';

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
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute in milliseconds
      limit: 100,  // 100 requests per minute
    }]),
    PrismaModule,
    AuthModule,
    DatabaseModule,
    RedisModule,
    ClientsModule,
    VenuesModule,
    RoomsModule,
    UsersModule,
    ControllersModule,
    DevicesModule,
    AdminModule,
    KioskModule,
    ScenesModule,
    PuzzlesModule,
    AudioModule
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    HeartbeatEventHandlerService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
