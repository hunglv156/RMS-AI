import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { APP_CONFIG, type AppConfig } from '../config';
import type { Database } from './types';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly kysely: Kysely<Database>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.kysely = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: config.databaseUrl, max: 10 }) }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.kysely.destroy();
  }
}
