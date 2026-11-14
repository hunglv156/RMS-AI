import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import type { Transaction } from 'kysely';
import type { Database } from '../db/types';
import { AiClient, AiHttpError } from './ai-client';
import {
  JOB_SCREEN, PIPELINE_VERSION, type ScreeningJobData,
} from './constants';
import { OutboxService } from './outbox.service';
import { TenantRunner } from './tenant-runner';

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 500);
const ACTIVE: Array<'queued' | 'waiting_document' | 'assessing'> = ['queued', 'waiting_document', 'assessing'];
const DOC_FAILED = ['rejected', 'failed_extraction', 'failed_provider', 'cancelled'];

/**
 * Chạy một lượt sàng lọc (README 3.5). Mỗi lần đổi trạng thái là một transaction ngắn; lúc chờ AI
 * không giữ transaction. Nếu CV chưa `ready` thì run sang `waiting_document` và được đánh thức khi
 * tài liệu xong (`wakeWaitingRuns`).
 */
@Injectable()
export class ScreeningPipeline {
  private readonly log = new Logger(ScreeningPipeline.name);

  constructor(
    @Inject(TenantRunner) private readonly tenants: TenantRunner,
    @Inject(AiClient) private readonly ai: AiClient,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}

  /** Gọi trong transaction đổi resume sang `ready`: đưa các run đang chờ CV này trở lại hàng đợi. */
  async wakeWaitingRuns(trx: Transaction<Database>, orgId: string, resumeId: string): Promise<void> {
    const runs = await trx.selectFrom('screening_runs').select('id')
      .where('organization_id', '=', orgId).where('resume_id', '=', resumeId)
      .where('status', '=', 'waiting_document').execute();
    for (const r of runs) {
      await trx.updateTable('screening_runs').set({ status: 'queued' })
        .where('organization_id', '=', orgId).where('id', '=', r.id).execute();
      await this.outbox.enqueue(trx, orgId, JOB_SCREEN, { run_id: r.id }, `${JOB_SCREEN}:${r.id}:doc-ready`);
    }
  }

  /** CV thất bại cuối cùng thì các run đang chờ nó cũng kết thúc, không treo mãi. */
  async failWaitingRuns(trx: Transaction<Database>, orgId: string, resumeId: string, docStatus: string): Promise<void> {
    await trx.updateTable('screening_runs')
      .set({ status: 'failed_validation', error: `document_${docStatus}`, finished_at: new Date() })
      .where('organization_id', '=', orgId).where('resume_id', '=', resumeId)
      .where('status', 'in', ['queued', 'waiting_document']).execute();
  }

  async assess(data: ScreeningJobData): Promise<void> {
    const orgId = data.organization_id;
    // Bước 1: kiểm tra tenant, khoá dòng resume để không lỡ nhịp với extract (xem wakeWaitingRuns).
    const ctx = await this.tenants.run(orgId, async (trx) => {
      const run = await trx.selectFrom('screening_runs').selectAll()
        .where('organization_id', '=', orgId).where('id', '=', data.run_id).executeTakeFirst();
      if (!run) throw new UnrecoverableError(`Run ${data.run_id} không thuộc tổ chức ${orgId}`);
      if (!(ACTIVE as string[]).includes(run.status)) return { skip: true as const };
      const resume = await trx.selectFrom('resumes').select('parse_status')
        .where('organization_id', '=', orgId).where('id', '=', run.resume_id).forUpdate().executeTakeFirstOrThrow();
      const setRun = (v: Record<string, unknown>) => trx.updateTable('screening_runs').set(v)
        .where('organization_id', '=', orgId).where('id', '=', run.id).execute();
      if (DOC_FAILED.includes(resume.parse_status)) {
        await setRun({ status: 'failed_validation', error: `document_${resume.parse_status}`, finished_at: new Date() });
        return { skip: true as const };
      }
      if (resume.parse_status !== 'ready') {
        await setRun({ status: 'waiting_document' });
        return { skip: true as const };
      }
      await setRun({ status: 'assessing' });
      const doc = await trx.selectFrom('document_processing_runs').select('extracted_text_key')
        .where('organization_id', '=', orgId).where('resume_id', '=', run.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).where('status', '=', 'succeeded').executeTakeFirst();
      if (!doc?.extracted_text_key) throw new UnrecoverableError('CV ready nhưng không có text đã trích xuất');
      const criteria = await trx.selectFrom('job_criteria').selectAll()
        .where('organization_id', '=', orgId).where('jd_version_id', '=', run.jd_version_id)
        .orderBy('sort_order').execute();
      const config = await trx.selectFrom('screening_configs').select(['rubric_values', 'min_coverage'])
        .where('organization_id', '=', orgId).where('id', '=', run.scoring_config_id).executeTakeFirstOrThrow();
      return { skip: false as const, run, textKey: doc.extracted_text_key, criteria, config };
    });
    if (ctx.skip) return;
    const { run, criteria, config } = ctx;

    let result;
    try {
      result = await this.ai.evaluate({
        organization_id: orgId, resume_id: run.resume_id, extracted_text_key: ctx.textKey,
        criteria: criteria.map((c) => ({
          code: c.code, label: c.label, description: c.description, weight: Number(c.weight), priority: c.priority,
        })),
        scoring: { rubric_values: config.rubric_values as Record<string, number>, min_coverage: Number(config.min_coverage) },
      });
    } catch (e) {
      if (e instanceof AiHttpError && e.permanent) {
        await this.markFailed(data, 'failed_validation', errText(e));
        throw new UnrecoverableError(errText(e));
      }
      throw e;
    }

    await this.tenants.run(orgId, async (trx) => {
      const versions = { ...(run.pipeline_versions_json as object), model: result.model, prompt_version: result.prompt_version };
      if (result.status !== 'ok' || !result.score) {
        await trx.updateTable('screening_runs')
          .set({
            status: 'failed_validation', error: (result.error ?? 'invalid output').slice(0, 500), finished_at: new Date(),
            timings_json: JSON.stringify(result.timings), pipeline_versions_json: JSON.stringify(versions),
          })
          .where('organization_id', '=', orgId).where('id', '=', run.id).execute();
        return;
      }
      const byCode = new Map(criteria.map((c) => [c.code, c.id]));
      for (const r of result.results) {
        const criterionId = byCode.get(r.code);
        if (!criterionId) throw new UnrecoverableError(`AI trả mã tiêu chí lạ: ${r.code}`);
        await trx.insertInto('screening_criterion_results')
          .values({
            organization_id: orgId, screening_run_id: run.id, criterion_id: criterionId, level: r.level,
            status: r.status, match_value: r.match_value, weight: r.weight, confidence: null,
            evidence_json: JSON.stringify(r.evidence), reason: r.rationale,
            raw_assessment_json: JSON.stringify(r.raw), validation_notes: JSON.stringify(r.notes),
          })
          .onConflict((oc) => oc.columns(['organization_id', 'screening_run_id', 'criterion_id']).doNothing())
          .execute();
      }
      await trx.updateTable('screening_runs')
        .set({
          status: 'completed', error: null, finished_at: new Date(),
          score_state: result.score.score_state, observed_score: result.score.observed_score,
          coverage: result.score.coverage, lower_bound: result.score.lower_bound,
          upper_bound: result.score.upper_bound, requires_manual_review: result.score.requires_manual_review,
          timings_json: JSON.stringify({ ...result.timings, truncated: result.truncated }),
          pipeline_versions_json: JSON.stringify(versions),
        })
        .where('organization_id', '=', orgId).where('id', '=', run.id).execute();
    });
  }

  async markFailed(data: ScreeningJobData, status: 'failed_validation' | 'failed_provider', message: string): Promise<void> {
    try {
      await this.tenants.run(data.organization_id, (trx) =>
        trx.updateTable('screening_runs').set({ status, error: message.slice(0, 500), finished_at: new Date() })
          .where('organization_id', '=', data.organization_id).where('id', '=', data.run_id)
          .where('status', 'in', ACTIVE).execute());
    } catch (e) {
      this.log.error(`markFailed run ${data.run_id}: ${errText(e)}`);
    }
  }
}
