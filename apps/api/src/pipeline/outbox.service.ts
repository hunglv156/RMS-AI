import { Inject, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService } from '../db/database.service';
import type { Database } from '../db/types';

export interface OutboxRow {
  id: string;
  organization_id: string;
  type: string;
  payload_json: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  /**
   * Ghi job vào outbox trong CÙNG transaction với dữ liệu nghiệp vụ: commit thì job chắc chắn tồn tại,
   * rollback thì không có job mồ côi. Trùng idempotency_key trong cùng tổ chức thì bỏ qua.
   */
  async enqueue(
    trx: Transaction<Database>,
    organizationId: string,
    type: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<string | null> {
    const row = await trx.insertInto('background_jobs')
      .values({
        organization_id: organizationId, type, payload_json: JSON.stringify(payload),
        idempotency_key: idempotencyKey, last_error: null, enqueued_at: null,
      })
      .onConflict((oc) => oc.columns(['organization_id', 'idempotency_key']).doNothing())
      .returning('id')
      .executeTakeFirst();
    return row?.id ?? null;
  }

  /** Job chưa gửi của mọi tenant (qua hàm SECURITY DEFINER, xem migration 0003). */
  async pending(limit: number): Promise<OutboxRow[]> {
    const r = await sql<OutboxRow>`SELECT * FROM outbox_pending(${limit})`.execute(this.db.kysely);
    return r.rows;
  }
}
