import { Inject, Injectable } from '@nestjs/common';
import type { AuditEventDto, Page } from '@rms/contracts';
import { TenantContext } from '../tenant/tenant-context';

@Injectable()
export class AuditService {
  constructor(@Inject(TenantContext) private readonly tenant: TenantContext) {}

  /** Ghi cùng transaction với thao tác nghiệp vụ: rollback thì audit cũng rollback. */
  async record(
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const { trx, organizationId, userId } = this.tenant.current();
    await trx.insertInto('audit_events').values({
      organization_id: organizationId, actor_id: userId, action,
      resource_type: resourceType, resource_id: resourceId,
      metadata_json: JSON.stringify(metadata),
    }).execute();
  }

  async list(page: number, pageSize: number): Promise<Page<AuditEventDto>> {
    const { trx, organizationId } = this.tenant.current();
    const base = trx.selectFrom('audit_events').where('organization_id', '=', organizationId);
    const total = Number((await base.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()).n);
    const rows = await base.selectAll().orderBy('created_at', 'desc').orderBy('id')
      .limit(pageSize).offset((page - 1) * pageSize).execute();
    return {
      items: rows.map((r) => ({
        id: r.id, actor_id: r.actor_id, action: r.action, resource_type: r.resource_type,
        resource_id: r.resource_id, metadata: r.metadata_json, created_at: new Date(r.created_at).toISOString(),
      })),
      page, page_size: pageSize, total,
    };
  }
}
