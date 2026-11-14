import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateJobInput, JobDto, ListQuery, Page, UpdateJobInput } from '@rms/contracts';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../tenant/tenant-context';

type Row = {
  id: string; title: string; description: string; status: JobDto['status'];
  created_by: string; created_at: Date; updated_at: Date;
};
const toDto = (r: Row): JobDto => ({
  id: r.id, title: r.title, description: r.description, status: r.status, created_by: r.created_by,
  created_at: new Date(r.created_at).toISOString(), updated_at: new Date(r.updated_at).toISOString(),
});

@Injectable()
export class JobsService {
  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(q: ListQuery): Promise<Page<JobDto>> {
    const { trx, organizationId } = this.tenant.current();
    let base = trx.selectFrom('jobs').where('organization_id', '=', organizationId);
    if (q.q) base = base.where('title', 'ilike', `%${q.q.replace(/[%_\\]/g, '\\$&')}%`);
    const total = Number((await base.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()).n);
    const rows = await base.select(['id', 'title', 'description', 'status', 'created_by', 'created_at', 'updated_at'])
      .orderBy('created_at', 'desc').orderBy('id')
      .limit(q.page_size).offset((q.page - 1) * q.page_size).execute();
    return { items: rows.map((r) => toDto(r as Row)), page: q.page, page_size: q.page_size, total };
  }

  async get(id: string): Promise<JobDto> {
    const { trx, organizationId } = this.tenant.current();
    const r = await trx.selectFrom('jobs')
      .select(['id', 'title', 'description', 'status', 'created_by', 'created_at', 'updated_at'])
      .where('organization_id', '=', organizationId).where('id', '=', id).executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy job');
    return toDto(r as Row);
  }

  async create(input: CreateJobInput): Promise<JobDto> {
    const { trx, organizationId, userId } = this.tenant.current();
    const r = await trx.insertInto('jobs')
      .values({ organization_id: organizationId, title: input.title, description: input.description,
        created_by: userId, active_jd_version_id: null })
      .returning(['id', 'title', 'description', 'status', 'created_by', 'created_at', 'updated_at'])
      .executeTakeFirstOrThrow();
    await this.audit.record('job.create', 'job', r.id, { title: r.title });
    return toDto(r as Row);
  }

  async update(id: string, input: UpdateJobInput): Promise<JobDto> {
    const { trx, organizationId } = this.tenant.current();
    const r = await trx.updateTable('jobs')
      .set({ ...input, updated_at: new Date() })
      .where('organization_id', '=', organizationId).where('id', '=', id)
      .returning(['id', 'title', 'description', 'status', 'created_by', 'created_at', 'updated_at'])
      .executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy job');
    await this.audit.record('job.update', 'job', id, { fields: Object.keys(input) });
    return toDto(r as Row);
  }
}
