import { Inject, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService } from '../db/database.service';
import type { Database } from '../db/types';

/**
 * Chạy việc nền trong context tenant: cùng cơ chế SET LOCAL như request HTTP, không có đường tắt.
 */
@Injectable()
export class TenantRunner {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  run<T>(organizationId: string, fn: (trx: Transaction<Database>) => Promise<T>): Promise<T> {
    return this.db.kysely.transaction().execute(async (trx) => {
      await sql`SELECT set_config('app.organization_id', ${organizationId}, true)`.execute(trx);
      return fn(trx);
    });
  }
}
