import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Role } from '@rms/contracts';
import type { Transaction } from 'kysely';
import type { Database } from '../db/types';

export interface TenantStore {
  trx: Transaction<Database>;
  organizationId: string;
  userId: string;
  role: Role;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Repository bắt buộc lấy transaction qua đây: không có context tenant thì không có DB handle,
 * nên không thể vô tình truy vấn ngoài RLS.
 */
@Injectable()
export class TenantContext {
  run<T>(store: TenantStore, fn: () => Promise<T>): Promise<T> {
    return storage.run(store, fn);
  }

  current(): TenantStore {
    const s = storage.getStore();
    if (!s) throw new Error('Không có tenant context: truy vấn tenant phải chạy trong TenantInterceptor');
    return s;
  }
}
