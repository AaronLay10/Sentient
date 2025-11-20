import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const databaseUrl = config.get<string>('DATABASE_URL');
    if (databaseUrl) {
      return new Pool({ connectionString: databaseUrl });
    }

    return new Pool({
      host: config.get<string>('POSTGRES_HOST'),
      port: config.get<number>('POSTGRES_PORT'),
      user: config.get<string>('POSTGRES_USER'),
      password: config.get<string>('POSTGRES_PASSWORD'),
      database: config.get<string>('POSTGRES_DB')
    });
  }
};

@Module({
  providers: [pgPoolProvider],
  exports: [pgPoolProvider]
})
export class DatabaseModule {}
