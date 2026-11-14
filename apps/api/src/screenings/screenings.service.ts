import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CriterionResultDto, EvidenceDto, ScreeningRunDetailDto, ScreeningRunDto,
} from '@rms/contracts';
import type { Transaction } from 'kysely';
import { AuditService } from '../audit/audit.service';
import type { Database } from '../db/types';
import { JOB_SCREEN, SCREENING_FINGERPRINT } from '../pipeline/constants';
import { OutboxService } from '../pipeline/outbox.service';
import { S3Service } from '../storage/s3.service';
import { TenantContext } from '../tenant/tenant-context';

const iso = (d: Date | string): string => new Date(d).toISOString();
const num = (v: number | string | null): number | null => (v === null ? null : Number(v));
const SCOPE = 'screening.create';

@Injectable()
export class ScreeningsService {
  private readonly log = new Logger(ScreeningsService.name);

  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  /** Tạo (hoặc trả lại) một lượt sàng lọc. Cùng Idempotency-Key + cùng nội dung thì trả đúng kết quả cũ. */
  async create(jobId: string, applicationId: string, key: string | undefined): Promise<ScreeningRunDto> {
    if (!key || key.length > 200) {
      throw new BadRequestException({ code: 'idempotency_key_required', message: 'Cần header Idempotency-Key (tối đa 200 ký tự)' });
    }
    const { trx, organizationId, userId } = this.tenant.current();
    const requestHash = createHash('sha256').update(`${jobId}:${applicationId}`).digest('hex');

    const claimed = await trx.insertInto('api_idempotency_keys')
      .values({ organization_id: organizationId, scope: SCOPE, idempotency_key: key, request_hash: requestHash, response_json: null })
      .onConflict((oc) => oc.columns(['organization_id', 'scope', 'idempotency_key']).doNothing())
      .returning('id').executeTakeFirst();
    if (!claimed) {
      const prev = await trx.selectFrom('api_idempotency_keys').select(['request_hash', 'response_json'])
        .where('organization_id', '=', organizationId).where('scope', '=', SCOPE)
        .where('idempotency_key', '=', key).executeTakeFirstOrThrow();
      if (prev.request_hash !== requestHash) {
        throw new UnprocessableEntityException({ code: 'idempotency_key_reuse', message: 'Idempotency-Key đã dùng cho yêu cầu khác' });
      }
      const runId = (prev.response_json as { id: string } | null)?.id;
      if (runId) return this.loadRun(trx, organizationId, runId);
      throw new ConflictException({ code: 'idempotency_in_flight', message: 'Yêu cầu trùng khoá đang được xử lý' });
    }

    const job = await trx.selectFrom('jobs').select('active_jd_version_id')
      .where('organization_id', '=', organizationId).where('id', '=', jobId).executeTakeFirst();
    if (!job) throw new NotFoundException('Không tìm thấy job');
    if (!job.active_jd_version_id) {
      throw new ConflictException({ code: 'no_approved_jd', message: 'Job chưa có JD version đã duyệt' });
    }
    const app = await trx.selectFrom('applications').select(['id', 'resume_id'])
      .where('organization_id', '=', organizationId).where('job_id', '=', jobId).where('id', '=', applicationId)
      .executeTakeFirst();
    if (!app) throw new NotFoundException('Không tìm thấy application trong job này');
    const config = await trx.selectFrom('screening_configs').select('id')
      .where('organization_id', '=', organizationId).where('name', '=', 'default')
      .orderBy('version_no', 'desc').limit(1).executeTakeFirst();
    if (!config) throw new ConflictException({ code: 'no_screening_config', message: 'Tổ chức chưa có cấu hình chấm điểm' });

    const inserted = await trx.insertInto('screening_runs')
      .values({
        organization_id: organizationId, application_id: app.id, jd_version_id: job.active_jd_version_id,
        resume_id: app.resume_id, scoring_config_id: config.id, pipeline_fingerprint: SCREENING_FINGERPRINT,
        pipeline_versions_json: JSON.stringify({ fingerprint: SCREENING_FINGERPRINT }),
        score_state: null, observed_score: null, coverage: null, lower_bound: null, upper_bound: null,
        error: null, timings_json: '{}', created_by: userId, finished_at: null,
      })
      .onConflict((oc) => oc.doNothing())
      .returning('id').executeTakeFirst();

    // Replay khác khoá: cùng CV, JD, config và pipeline thì dùng lại run đã có.
    const runId = inserted?.id ?? (await trx.selectFrom('screening_runs').select('id')
      .where('organization_id', '=', organizationId).where('application_id', '=', app.id)
      .where('resume_id', '=', app.resume_id).where('jd_version_id', '=', job.active_jd_version_id)
      .where('scoring_config_id', '=', config.id).where('pipeline_fingerprint', '=', SCREENING_FINGERPRINT)
      .executeTakeFirstOrThrow()).id;

    if (inserted) {
      await this.outbox.enqueue(trx, organizationId, JOB_SCREEN, { run_id: runId }, `${JOB_SCREEN}:${runId}`);
      await this.audit.record('screening.create', 'screening_run', runId, { job_id: jobId, application_id: app.id });
    }
    await trx.updateTable('api_idempotency_keys').set({ response_json: JSON.stringify({ id: runId }) })
      .where('organization_id', '=', organizationId).where('id', '=', claimed.id).execute();
    return this.loadRun(trx, organizationId, runId);
  }

  async list(jobId: string): Promise<{ items: ScreeningRunDto[] }> {
    const { trx, organizationId } = this.tenant.current();
    const job = await trx.selectFrom('jobs').select('id')
      .where('organization_id', '=', organizationId).where('id', '=', jobId).executeTakeFirst();
    if (!job) throw new NotFoundException('Không tìm thấy job');
    const ids = await trx.selectFrom('screening_runs')
      .innerJoin('applications', (j) => j.onRef('applications.id', '=', 'screening_runs.application_id')
        .onRef('applications.organization_id', '=', 'screening_runs.organization_id'))
      .select('screening_runs.id')
      .where('screening_runs.organization_id', '=', organizationId).where('applications.job_id', '=', jobId)
      .orderBy('screening_runs.created_at', 'desc').execute();
    const items: ScreeningRunDto[] = [];
    for (const { id } of ids) items.push(await this.loadRun(trx, organizationId, id));
    return { items };
  }

  async get(jobId: string, runId: string): Promise<ScreeningRunDetailDto> {
    const { trx, organizationId } = this.tenant.current();
    const run = await this.loadRun(trx, organizationId, runId);
    const app = await trx.selectFrom('applications').select(['job_id', 'resume_id'])
      .where('organization_id', '=', organizationId).where('id', '=', run.application_id).executeTakeFirstOrThrow();
    if (app.job_id !== jobId) throw new NotFoundException('Không tìm thấy lượt sàng lọc');

    const rows = await trx.selectFrom('screening_criterion_results as r')
      .innerJoin('job_criteria as c', (j) => j.onRef('c.id', '=', 'r.criterion_id').onRef('c.organization_id', '=', 'r.organization_id'))
      .select(['r.criterion_id', 'c.code', 'c.label', 'c.priority', 'c.sort_order', 'r.level', 'r.status', 'r.match_value',
        'r.weight', 'r.reason', 'r.evidence_json', 'r.validation_notes'])
      .where('r.organization_id', '=', organizationId).where('r.screening_run_id', '=', runId)
      .orderBy('c.sort_order').execute();
    const results: CriterionResultDto[] = rows.map((r) => ({
      criterion_id: r.criterion_id, code: r.code, label: r.label, priority: r.priority,
      level: r.level as CriterionResultDto['level'], status: r.status as CriterionResultDto['status'],
      match_value: num(r.match_value), weight: Number(r.weight), reason: r.reason,
      evidence: r.evidence_json as EvidenceDto[], notes: r.validation_notes as string[],
    }));
    const raw = await trx.selectFrom('screening_runs').select(['timings_json', 'pipeline_versions_json'])
      .where('organization_id', '=', organizationId).where('id', '=', runId).executeTakeFirstOrThrow();
    const versions = raw.pipeline_versions_json as { model?: string; prompt_version?: string };
    return {
      ...run, results, cv_text: await this.cvText(trx, organizationId, app.resume_id),
      timings: raw.timings_json as Record<string, unknown>,
      model: versions.model ?? null, prompt_version: versions.prompt_version ?? null,
    };
  }

  /** Văn bản đã trích xuất của CV, để UI tô sáng trích dẫn. Không đọc được thì UI vẫn hiện trích dẫn. */
  private async cvText(trx: Transaction<Database>, orgId: string, resumeId: string): Promise<string | null> {
    const doc = await trx.selectFrom('document_processing_runs').select('extracted_text_key')
      .where('organization_id', '=', orgId).where('resume_id', '=', resumeId)
      .where('status', '=', 'succeeded').executeTakeFirst();
    if (!doc?.extracted_text_key || !doc.extracted_text_key.startsWith(`org/${orgId}/`)) return null;
    try {
      return (await this.s3.get(doc.extracted_text_key)).toString('utf8');
    } catch (e) {
      this.log.warn(`Không đọc được text của CV ${resumeId}: ${(e as Error).message}`);
      return null;
    }
  }

  private async loadRun(trx: Transaction<Database>, orgId: string, runId: string): Promise<ScreeningRunDto> {
    const r = await trx.selectFrom('screening_runs as s')
      .innerJoin('applications as a', (j) => j.onRef('a.id', '=', 's.application_id').onRef('a.organization_id', '=', 's.organization_id'))
      .innerJoin('candidates as c', (j) => j.onRef('c.id', '=', 'a.candidate_id').onRef('c.organization_id', '=', 'a.organization_id'))
      .select(['s.id', 's.application_id', 'c.display_name', 's.jd_version_id', 's.status', 's.score_state', 's.observed_score',
        's.coverage', 's.lower_bound', 's.upper_bound', 's.requires_manual_review', 's.error', 's.created_at', 's.finished_at'])
      .where('s.organization_id', '=', orgId).where('s.id', '=', runId).executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy lượt sàng lọc');
    return {
      id: r.id, application_id: r.application_id, candidate_name: r.display_name, jd_version_id: r.jd_version_id,
      status: r.status, score_state: r.score_state, observed_score: num(r.observed_score), coverage: num(r.coverage),
      lower_bound: num(r.lower_bound), upper_bound: num(r.upper_bound),
      requires_manual_review: r.requires_manual_review, error: r.error,
      created_at: iso(r.created_at), finished_at: r.finished_at ? iso(r.finished_at) : null,
    };
  }
}
