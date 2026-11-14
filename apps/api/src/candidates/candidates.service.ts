import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CandidateDto, CreateCandidateInput, ListQuery, Page } from '@rms/contracts';
import { AuditService } from '../audit/audit.service';
import { S3Service } from '../storage/s3.service';
import { TenantContext } from '../tenant/tenant-context';

type Row = {
  id: string; display_name: string; contact_json: unknown;
  consent_status: CandidateDto['consent_status']; created_at: Date;
};
const COLS = ['id', 'display_name', 'contact_json', 'consent_status', 'created_at'] as const;
const toDto = (r: Row): CandidateDto => ({
  id: r.id, display_name: r.display_name, contact: (r.contact_json ?? {}) as CandidateDto['contact'],
  consent_status: r.consent_status, created_at: new Date(r.created_at).toISOString(),
});

@Injectable()
export class CandidatesService {
  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  async list(q: ListQuery): Promise<Page<CandidateDto>> {
    const { trx, organizationId } = this.tenant.current();
    let base = trx.selectFrom('candidates').where('organization_id', '=', organizationId);
    if (q.q) base = base.where('display_name', 'ilike', `%${q.q.replace(/[%_\\]/g, '\\$&')}%`);
    const total = Number((await base.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()).n);
    const rows = await base.select([...COLS]).orderBy('created_at', 'desc').orderBy('id')
      .limit(q.page_size).offset((q.page - 1) * q.page_size).execute();
    return { items: rows.map((r) => toDto(r as Row)), page: q.page, page_size: q.page_size, total };
  }

  async get(id: string): Promise<CandidateDto> {
    const { trx, organizationId } = this.tenant.current();
    const r = await trx.selectFrom('candidates').select([...COLS])
      .where('organization_id', '=', organizationId).where('id', '=', id).executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy ứng viên');
    return toDto(r as Row);
  }

  async create(input: CreateCandidateInput): Promise<CandidateDto> {
    const { trx, organizationId, userId } = this.tenant.current();
    const r = await trx.insertInto('candidates')
      .values({ organization_id: organizationId, display_name: input.display_name,
        contact_json: JSON.stringify(input.contact), consent_status: input.consent_status, created_by: userId })
      .returning([...COLS]).executeTakeFirstOrThrow();
    // Audit không chứa PII: chỉ ghi id.
    await this.audit.record('candidate.create', 'candidate', r.id);
    return toDto(r as Row);
  }

  async remove(id: string): Promise<void> {
    const { trx, organizationId } = this.tenant.current();
    const resumes = await trx.selectFrom('resumes').select('object_key')
      .where('organization_id', '=', organizationId).where('candidate_id', '=', id).execute();
    const r = await trx.deleteFrom('candidates')
      .where('organization_id', '=', organizationId).where('id', '=', id).executeTakeFirst();
    if (Number(r.numDeletedRows) === 0) throw new NotFoundException('Không tìm thấy ứng viên');
    await this.audit.record('candidate.delete', 'candidate', id);
    // Xoá file gốc cùng ứng viên (retention). Lỗi S3 làm hỏng request để không bỏ sót file.
    for (const { object_key } of resumes) await this.s3.remove(object_key);
  }
}
