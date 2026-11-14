import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, UnrecoverableError, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../config';
import {
  JOB_EXTRACT, JOB_PARSE, JOB_SCREEN, QUEUE_DEAD, QUEUE_EXTRACT, QUEUE_PARSE, QUEUE_SCREEN,
  type DocumentJobData, type ScreeningJobData,
} from './constants';
import { DocumentPipeline, type Stage } from './document-pipeline.service';
import { OutboxService, type OutboxRow } from './outbox.service';
import { ScreeningPipeline } from './screening-pipeline.service';
import { TenantRunner } from './tenant-runner';

type AnyJob = DocumentJobData | ScreeningJobData;

/**
 * Cầu nối outbox → BullMQ và các worker. Poller đẩy job đã commit trong DB sang Redis;
 * jobId = id dòng outbox nên đẩy lặp lại không tạo job thứ hai.
 */
@Injectable()
export class PipelineRuntime implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PipelineRuntime.name);
  private connection?: IORedis;
  private parseQueue?: Queue;
  private extractQueue?: Queue;
  private screenQueue?: Queue;
  private deadQueue?: Queue;
  private workers: Worker[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(TenantRunner) private readonly tenants: TenantRunner,
    @Inject(DocumentPipeline) private readonly pipeline: DocumentPipeline,
    @Inject(ScreeningPipeline) private readonly screening: ScreeningPipeline,
  ) {}

  async onModuleInit(): Promise<void> {
    const p = this.config.pipeline;
    if (!p.enabled) return;
    this.connection = new IORedis(this.config.redisUrl, { maxRetriesPerRequest: null });
    const opts = { connection: this.connection, prefix: p.queuePrefix };
    const jobOptions = {
      attempts: p.attempts,
      backoff: { type: 'exponential', delay: p.backoffMs },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    };
    this.parseQueue = new Queue(QUEUE_PARSE, { ...opts, defaultJobOptions: jobOptions });
    this.extractQueue = new Queue(QUEUE_EXTRACT, { ...opts, defaultJobOptions: jobOptions });
    this.screenQueue = new Queue(QUEUE_SCREEN, { ...opts, defaultJobOptions: jobOptions });
    this.deadQueue = new Queue(QUEUE_DEAD, opts);

    this.workers = [
      this.makeWorker(QUEUE_PARSE, 'parse', p.parseConcurrency, (d) => this.pipeline.parse(d as DocumentJobData), opts),
      // Concurrency 1: LLM Qwen3 14B xử lý tuần tự (ADR 0002).
      this.makeWorker(QUEUE_EXTRACT, 'extract', p.extractConcurrency, (d) => this.pipeline.extract(d as DocumentJobData), opts),
      this.makeWorker(QUEUE_SCREEN, 'assess', p.screenConcurrency, (d) => this.screening.assess(d as ScreeningJobData), opts),
    ];
    this.timer = setInterval(() => void this.dispatchPending(), p.pollIntervalMs);
  }

  private makeWorker(
    queue: string, stage: Stage, concurrency: number,
    handler: (d: AnyJob) => Promise<void>,
    opts: { connection: IORedis; prefix: string },
  ): Worker {
    const worker = new Worker<AnyJob>(queue, (job) => handler(job.data), {
      ...opts, concurrency, lockDuration: this.config.pipeline.lockDurationMs,
    });
    worker.on('completed', (job) => void this.markOutbox(job.data, 'done'));
    worker.on('failed', (job, err) => void this.onFailed(stage, job, err));
    worker.on('error', (err) => this.log.error(`worker ${queue}: ${err.message}`));
    return worker;
  }

  private async onFailed(stage: Stage, job: Job<AnyJob> | undefined, err: Error): Promise<void> {
    if (!job) return;
    const final = err instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!final) {
      this.log.warn(`${job.name} ${job.id} lỗi lần ${job.attemptsMade}, sẽ retry: ${err.message}`);
      return;
    }
    // Hết lượt retry: đánh dấu tài liệu lỗi và chuyển job vào dead-letter queue để xem xét.
    if (stage === 'assess') {
      await this.screening.markFailed(job.data as ScreeningJobData, 'failed_provider', err.message);
    } else {
      await this.pipeline.markFailed(
        job.data as DocumentJobData, stage, stage === 'parse' ? 'failed_extraction' : 'failed_provider', err.message);
    }
    await this.deadQueue?.add('dead', {
      queue: job.queueName, job: job.name, data: job.data, error: err.message.slice(0, 500),
      attempts: job.attemptsMade,
    });
    await this.markOutbox(job.data, 'failed', err.message);
  }

  private async markOutbox(data: { outboxId: string; organization_id: string }, status: 'done' | 'failed', error?: string): Promise<void> {
    try {
      await this.tenants.run(data.organization_id, (trx) =>
        trx.updateTable('background_jobs')
          .set({ status, last_error: error?.slice(0, 500) ?? null })
          .where('organization_id', '=', data.organization_id).where('id', '=', data.outboxId).execute());
    } catch (e) {
      this.log.error(`markOutbox ${data.outboxId}: ${(e as Error).message}`);
    }
  }

  /** Đẩy các dòng outbox chưa gửi sang BullMQ. Trả về số dòng đã xử lý. */
  async dispatchPending(limit = 50): Promise<number> {
    if (this.polling || !this.parseQueue) return 0;
    this.polling = true;
    try {
      const rows = await this.outbox.pending(limit);
      for (const row of rows) await this.dispatch(row);
      return rows.length;
    } catch (e) {
      this.log.error(`poll outbox: ${(e as Error).message}`);
      return 0;
    } finally {
      this.polling = false;
    }
  }

  private async dispatch(row: OutboxRow): Promise<void> {
    if (row.type === JOB_SCREEN) {
      const data: ScreeningJobData = {
        outboxId: row.id, organization_id: row.organization_id, run_id: (row.payload_json as { run_id: string }).run_id,
      };
      await this.screenQueue?.add(row.type, data, { jobId: row.id });
      await this.markEnqueued(row);
      return;
    }
    const queue = row.type === JOB_PARSE ? this.parseQueue : row.type === JOB_EXTRACT ? this.extractQueue : undefined;
    if (!queue) {
      this.log.error(`Loại job lạ trong outbox: ${row.type}`);
      return;
    }
    const payload = row.payload_json as { resume_id: string; actor_id: string | null };
    const data: DocumentJobData = {
      outboxId: row.id, organization_id: row.organization_id,
      resume_id: payload.resume_id, actor_id: payload.actor_id ?? null,
    };
    await queue.add(row.type, data, { jobId: row.id });
    await this.tenants.run(row.organization_id, async (trx) => {
      if (row.type === JOB_PARSE) {
        await trx.updateTable('resumes').set({ parse_status: 'queued' })
          .where('organization_id', '=', row.organization_id).where('id', '=', data.resume_id)
          .where('parse_status', '=', 'uploaded').execute();
      }
    });
    await this.markEnqueued(row);
  }

  private markEnqueued(row: OutboxRow): Promise<unknown> {
    return this.tenants.run(row.organization_id, (trx) =>
      trx.updateTable('background_jobs').set({ status: 'enqueued', enqueued_at: new Date() })
        .where('organization_id', '=', row.organization_id).where('id', '=', row.id)
        .where('status', '=', 'pending').execute());
  }

  /** Dùng cho test: đưa thẳng một job vào hàng đợi mà không qua outbox. */
  async addRaw(type: string, data: DocumentJobData): Promise<void> {
    const q = type === JOB_PARSE ? this.parseQueue : this.extractQueue;
    await q?.add(type, data, { jobId: `raw-${data.outboxId}` });
  }

  async deadLetters(): Promise<Array<{ data: Record<string, unknown> }>> {
    const jobs = (await this.deadQueue?.getJobs(['waiting', 'delayed', 'completed'])) ?? [];
    return jobs.map((j) => ({ data: j.data as Record<string, unknown> }));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([this.parseQueue, this.extractQueue, this.screenQueue, this.deadQueue].map((q) => q?.close()));
    this.connection?.disconnect();
  }

  /** Dọn toàn bộ dữ liệu Redis của prefix này (test). */
  async obliterate(): Promise<void> {
    for (const q of [this.parseQueue, this.extractQueue, this.screenQueue, this.deadQueue]) {
      await q?.obliterate({ force: true }).catch(() => undefined);
    }
  }
}
