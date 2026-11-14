import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { AiClient, AiHttpError } from './ai-client';
import {
  JOB_EXTRACT, PIPELINE_VERSION, type DocumentJobData,
} from './constants';
import { OutboxService } from './outbox.service';
import { ScreeningPipeline } from './screening-pipeline.service';
import { TenantRunner } from './tenant-runner';

export type Stage = 'parse' | 'extract' | 'assess';

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 500);

/**
 * State machine của document (README 3.5):
 * uploaded → queued → validating → extracting → ready, hoặc rejected / failed_*.
 * Mỗi giai đoạn chạy trong job riêng, mỗi lần đổi trạng thái là một transaction ngắn
 * (không giữ transaction trong lúc chờ AI).
 */
@Injectable()
export class DocumentPipeline {
  private readonly log = new Logger(DocumentPipeline.name);

  constructor(
    @Inject(TenantRunner) private readonly tenants: TenantRunner,
    @Inject(AiClient) private readonly ai: AiClient,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(ScreeningPipeline) private readonly screening: ScreeningPipeline,
  ) {}

  /** Kiểm tra lại tenant trước khi chạy: resume phải tồn tại TRONG tổ chức mà job tuyên bố. */
  private async loadResume(data: DocumentJobData) {
    const resume = await this.tenants.run(data.organization_id, (trx) =>
      trx.selectFrom('resumes')
        .select(['id', 'organization_id', 'object_key', 'mime_type', 'parse_status'])
        .where('organization_id', '=', data.organization_id)
        .where('id', '=', data.resume_id)
        .executeTakeFirst(),
    );
    if (!resume) {
      throw new UnrecoverableError(`Resume ${data.resume_id} không thuộc tổ chức ${data.organization_id}`);
    }
    return resume;
  }

  async parse(data: DocumentJobData): Promise<void> {
    const resume = await this.loadResume(data);
    if (resume.parse_status === 'ready') return; // đã xử lý xong: replay không làm lại

    const orgId = data.organization_id;
    const run = await this.tenants.run(orgId, async (trx) => {
      await trx.updateTable('resumes').set({ parse_status: 'validating' })
        .where('organization_id', '=', orgId).where('id', '=', data.resume_id)
        .where('parse_status', 'in', ['uploaded', 'queued', 'validating', 'extracting']).execute();
      await trx.insertInto('document_processing_runs')
        .values({
          organization_id: orgId, resume_id: data.resume_id, pipeline_version: PIPELINE_VERSION,
          error: null, extracted_text_key: null, structured_profile_json: null,
          prompt_version: null, model: null, finished_at: null,
        })
        .onConflict((oc) => oc.columns(['organization_id', 'resume_id', 'pipeline_version']).doNothing())
        .execute();
      return trx.selectFrom('document_processing_runs').select(['status', 'extracted_text_key'])
        .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).executeTakeFirstOrThrow();
    });
    if (run.status === 'succeeded') return;

    let parsed;
    try {
      parsed = await this.ai.parse({
        organization_id: orgId, resume_id: data.resume_id,
        object_key: resume.object_key, mime_type: resume.mime_type,
      });
    } catch (e) {
      if (e instanceof AiHttpError && e.permanent) {
        // Tài liệu không đọc được: từ chối ngay, không retry.
        await this.markFailed(data, 'parse', 'rejected', errText(e));
        throw new UnrecoverableError(errText(e));
      }
      throw e;
    }

    await this.tenants.run(orgId, async (trx) => {
      await trx.updateTable('document_processing_runs')
        .set({
          extracted_text_key: parsed.extracted_text_key,
          quality_flags_json: JSON.stringify({ flags: parsed.quality_flags, ocr_used: parsed.ocr_used }),
          timings_json: JSON.stringify({ parser_version: parsed.parser_version, char_count: parsed.char_count }),
        })
        .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).execute();
      await trx.updateTable('resumes')
        .set({
          parse_status: 'extracting',
          page_count: parsed.page_count,
          // OCR kém hoặc text quá ngắn là bất định của quá trình trích xuất, cần người xem lại.
          requires_manual_review: parsed.quality_flags.includes('too_short'),
        })
        .where('organization_id', '=', orgId).where('id', '=', data.resume_id).execute();
      await this.outbox.enqueue(trx, orgId, JOB_EXTRACT, { resume_id: data.resume_id, actor_id: data.actor_id },
        `${JOB_EXTRACT}:${data.resume_id}:${PIPELINE_VERSION}`);
    });
  }

  async extract(data: DocumentJobData): Promise<void> {
    const resume = await this.loadResume(data);
    const orgId = data.organization_id;
    if (resume.parse_status === 'ready') return;
    const run = await this.tenants.run(orgId, (trx) =>
      trx.selectFrom('document_processing_runs').select(['status', 'extracted_text_key'])
        .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).executeTakeFirst(),
    );
    if (!run?.extracted_text_key) throw new UnrecoverableError('Chưa có text đã trích xuất để chạy extract');
    if (run.status === 'succeeded') return;

    let result;
    try {
      result = await this.ai.extract({
        organization_id: orgId, resume_id: data.resume_id, extracted_text_key: run.extracted_text_key,
      });
    } catch (e) {
      if (e instanceof AiHttpError && e.permanent) {
        await this.markFailed(data, 'extract', 'failed_extraction', errText(e));
        throw new UnrecoverableError(errText(e));
      }
      throw e;
    }

    await this.tenants.run(orgId, async (trx) => {
      const prev = await trx.selectFrom('document_processing_runs').select('timings_json')
        .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).executeTakeFirstOrThrow();
      await trx.updateTable('document_processing_runs')
        .set({
          status: 'succeeded', error: null, finished_at: new Date(),
          structured_profile_json: JSON.stringify(result.profile),
          prompt_version: result.prompt_version, model: result.model,
          timings_json: JSON.stringify({ ...(prev.timings_json as object), extract: result.timings, truncated: result.truncated }),
        })
        .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
        .where('pipeline_version', '=', PIPELINE_VERSION).execute();
      await trx.updateTable('resumes').set({ parse_status: 'ready' })
        .where('organization_id', '=', orgId).where('id', '=', data.resume_id).execute();
      // Các lượt sàng lọc đang chờ CV này được đánh thức trong cùng transaction.
      await this.screening.wakeWaitingRuns(trx, orgId, data.resume_id);
    });
  }

  /** Gọi khi một giai đoạn đã hết lượt retry (hoặc lỗi không thể phục hồi). */
  async markFailed(
    data: DocumentJobData, stage: Stage,
    status: 'rejected' | 'failed_extraction' | 'failed_provider' | 'cancelled', message: string,
  ): Promise<void> {
    const orgId = data.organization_id;
    try {
      await this.tenants.run(orgId, async (trx) => {
        await trx.updateTable('resumes').set({ parse_status: status })
          .where('organization_id', '=', orgId).where('id', '=', data.resume_id)
          // Không ghi đè trạng thái đã kết thúc (vd rejected do parse đã đặt trước khi handler hết-retry chạy).
          .where('parse_status', 'in', ['uploaded', 'queued', 'validating', 'extracting', 'indexing'])
          .execute();
        await trx.updateTable('document_processing_runs')
          .set({ status: 'failed', error: `${stage}: ${message}`, finished_at: new Date() })
          .where('organization_id', '=', orgId).where('resume_id', '=', data.resume_id)
          .where('pipeline_version', '=', PIPELINE_VERSION).where('status', '=', 'running').execute();
        // Lý do của run phải theo trạng thái thật của CV (vd `rejected` đã đặt trước lần gọi hết-retry này).
        const current = await trx.selectFrom('resumes').select('parse_status')
          .where('organization_id', '=', orgId).where('id', '=', data.resume_id).executeTakeFirst();
        await this.screening.failWaitingRuns(trx, orgId, data.resume_id, current?.parse_status ?? status);
      });
    } catch (e) {
      this.log.error(`markFailed ${data.resume_id}: ${errText(e)}`);
    }
  }
}
