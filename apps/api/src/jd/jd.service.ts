import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ApplicationDto, CreateApplicationInput, CreateJdVersionInput, CriterionDto, JdVersionDto,
  PutCriteriaInput,
} from '@rms/contracts';
import type { Transaction } from 'kysely';
import { AuditService } from '../audit/audit.service';
import type { Database } from '../db/types';
import { TenantContext } from '../tenant/tenant-context';

const iso = (d: Date | string): string => new Date(d).toISOString();

@Injectable()
export class JdService {
  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async assertJob(trx: Transaction<Database>, orgId: string, jobId: string): Promise<void> {
    const job = await trx.selectFrom('jobs').select('id')
      .where('organization_id', '=', orgId).where('id', '=', jobId).executeTakeFirst();
    if (!job) throw new NotFoundException('Không tìm thấy job');
  }

  private async load(trx: Transaction<Database>, orgId: string, jobId: string, versionId: string): Promise<JdVersionDto> {
    const v = await trx.selectFrom('jd_versions').selectAll()
      .where('organization_id', '=', orgId).where('job_id', '=', jobId).where('id', '=', versionId)
      .executeTakeFirst();
    if (!v) throw new NotFoundException('Không tìm thấy JD version');
    const rows = await trx.selectFrom('job_criteria').selectAll()
      .where('organization_id', '=', orgId).where('jd_version_id', '=', versionId)
      .orderBy('sort_order').execute();
    const criteria: CriterionDto[] = rows.map((c) => ({
      id: c.id, code: c.code, label: c.label, type: c.type as CriterionDto['type'], priority: c.priority,
      weight: Number(c.weight), description: c.description,
      evidence_guidance: c.evidence_guidance_json as string[], sort_order: c.sort_order,
    }));
    return {
      id: v.id, job_id: v.job_id, version_no: v.version_no, approval_status: v.approval_status,
      approved_at: v.approved_at ? iso(v.approved_at) : null,
      content: v.content_json as Record<string, unknown>, created_at: iso(v.created_at), criteria,
    };
  }

  async list(jobId: string): Promise<{ items: JdVersionDto[] }> {
    const { trx, organizationId } = this.tenant.current();
    await this.assertJob(trx, organizationId, jobId);
    const ids = await trx.selectFrom('jd_versions').select('id')
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId)
      .orderBy('version_no', 'desc').execute();
    const items = [];
    for (const { id } of ids) items.push(await this.load(trx, organizationId, jobId, id));
    return { items };
  }

  async get(jobId: string, versionId: string): Promise<JdVersionDto> {
    const { trx, organizationId } = this.tenant.current();
    return this.load(trx, organizationId, jobId, versionId);
  }

  async create(jobId: string, input: CreateJdVersionInput): Promise<JdVersionDto> {
    const { trx, organizationId, userId } = this.tenant.current();
    await this.assertJob(trx, organizationId, jobId);
    // Khoá job để hai request đồng thời không cấp trùng version_no.
    await trx.selectFrom('jobs').select('id').where('organization_id', '=', organizationId)
      .where('id', '=', jobId).forUpdate().execute();
    const max = await trx.selectFrom('jd_versions').select((eb) => eb.fn.max('version_no').as('m'))
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId).executeTakeFirst();
    const v = await trx.insertInto('jd_versions')
      .values({
        organization_id: organizationId, job_id: jobId, version_no: (max?.m ?? 0) + 1,
        content_json: JSON.stringify(input.content), approved_by: null, approved_at: null,
        prompt_version: null, created_by: userId,
      })
      .returning('id').executeTakeFirstOrThrow();
    await this.audit.record('jd_version.create', 'jd_version', v.id, { job_id: jobId });
    return this.load(trx, organizationId, jobId, v.id);
  }

  async putCriteria(jobId: string, versionId: string, input: PutCriteriaInput): Promise<JdVersionDto> {
    const { trx, organizationId } = this.tenant.current();
    const v = await trx.selectFrom('jd_versions').select('approval_status')
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId).where('id', '=', versionId)
      .forUpdate().executeTakeFirst();
    if (!v) throw new NotFoundException('Không tìm thấy JD version');
    if (v.approval_status === 'approved') {
      throw new ConflictException({ code: 'jd_approved', message: 'JD version đã duyệt, không sửa được' });
    }
    await trx.deleteFrom('job_criteria')
      .where('organization_id', '=', organizationId).where('jd_version_id', '=', versionId).execute();
    for (const [i, c] of input.criteria.entries()) {
      await trx.insertInto('job_criteria').values({
        organization_id: organizationId, jd_version_id: versionId, code: c.code, label: c.label,
        type: c.type, description: c.description, priority: c.priority, weight: c.weight,
        evidence_guidance_json: JSON.stringify(c.evidence_guidance), sort_order: i,
      }).execute();
    }
    await this.audit.record('jd_criteria.update', 'jd_version', versionId, { count: input.criteria.length });
    return this.load(trx, organizationId, jobId, versionId);
  }

  async approve(jobId: string, versionId: string): Promise<JdVersionDto> {
    const { trx, organizationId, userId } = this.tenant.current();
    const v = await trx.selectFrom('jd_versions').select('approval_status')
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId).where('id', '=', versionId)
      .forUpdate().executeTakeFirst();
    if (!v) throw new NotFoundException('Không tìm thấy JD version');
    if (v.approval_status === 'approved') {
      throw new ConflictException({ code: 'jd_approved', message: 'JD version đã được duyệt' });
    }
    const crit = await trx.selectFrom('job_criteria').select(['weight'])
      .where('organization_id', '=', organizationId).where('jd_version_id', '=', versionId).execute();
    if (crit.length === 0 || !(crit.reduce((a, c) => a + Number(c.weight), 0) > 0)) {
      throw new ConflictException({ code: 'criteria_invalid', message: 'Cần ít nhất một tiêu chí và tổng trọng số > 0 trước khi duyệt' });
    }
    await trx.updateTable('jd_versions')
      .set({ approval_status: 'approved', approved_by: userId, approved_at: new Date() })
      .where('organization_id', '=', organizationId).where('id', '=', versionId).execute();
    await trx.updateTable('jobs').set({ active_jd_version_id: versionId, updated_at: new Date() })
      .where('organization_id', '=', organizationId).where('id', '=', jobId).execute();
    await this.audit.record('jd_version.approve', 'jd_version', versionId, { job_id: jobId });
    return this.load(trx, organizationId, jobId, versionId);
  }

  // ===== Applications =====
  async createApplication(jobId: string, input: CreateApplicationInput): Promise<ApplicationDto> {
    const { trx, organizationId, userId } = this.tenant.current();
    await this.assertJob(trx, organizationId, jobId);
    const resume = await trx.selectFrom('resumes').select(['id', 'candidate_id'])
      .where('organization_id', '=', organizationId).where('id', '=', input.resume_id).executeTakeFirst();
    const candidate = await trx.selectFrom('candidates').select('id')
      .where('organization_id', '=', organizationId).where('id', '=', input.candidate_id).executeTakeFirst();
    if (!candidate || !resume) throw new NotFoundException('Không tìm thấy ứng viên hoặc CV');
    if (resume.candidate_id !== candidate.id) {
      throw new ConflictException({ code: 'resume_candidate_mismatch', message: 'CV không thuộc ứng viên này' });
    }
    const dup = await trx.selectFrom('applications').select('id')
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId)
      .where('candidate_id', '=', input.candidate_id).executeTakeFirst();
    if (dup) throw new ConflictException({ code: 'application_exists', message: 'Ứng viên đã được gắn vào job này' });
    const a = await trx.insertInto('applications')
      .values({ organization_id: organizationId, job_id: jobId, candidate_id: input.candidate_id,
        resume_id: input.resume_id, created_by: userId })
      .returning('id').executeTakeFirstOrThrow();
    await this.audit.record('application.create', 'application', a.id, { job_id: jobId });
    return (await this.listApplications(jobId)).items.find((x) => x.id === a.id) as ApplicationDto;
  }

  async listApplications(jobId: string): Promise<{ items: ApplicationDto[] }> {
    const { trx, organizationId } = this.tenant.current();
    await this.assertJob(trx, organizationId, jobId);
    const rows = await trx.selectFrom('applications')
      .innerJoin('candidates', (j) => j.onRef('candidates.id', '=', 'applications.candidate_id')
        .onRef('candidates.organization_id', '=', 'applications.organization_id'))
      .innerJoin('resumes', (j) => j.onRef('resumes.id', '=', 'applications.resume_id')
        .onRef('resumes.organization_id', '=', 'applications.organization_id'))
      .select(['applications.id', 'applications.job_id', 'applications.candidate_id',
        'candidates.display_name', 'applications.resume_id', 'resumes.parse_status',
        'applications.stage', 'applications.created_at'])
      .where('applications.organization_id', '=', organizationId).where('applications.job_id', '=', jobId)
      .orderBy('applications.created_at', 'desc').execute();
    return {
      items: rows.map((r) => ({
        id: r.id, job_id: r.job_id, candidate_id: r.candidate_id, candidate_name: r.display_name,
        resume_id: r.resume_id, resume_status: r.parse_status, stage: r.stage, created_at: iso(r.created_at),
      })),
    };
  }
}
