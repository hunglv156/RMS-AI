import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { Database } from "../db/database";
import { ExecutionError } from "../screenings/validation";
import { ScreeningExecution } from "../screenings/execution.service";
import { redisConnection, queuePrefix } from "./connection";
@Injectable()
export class QueueRuntime implements OnModuleInit, OnModuleDestroy {
  private readonly redis = redisConnection();
  private queueInstance?: Queue;
  get queue(): Queue {
    if (!this.queueInstance) {
      this.queueInstance = new Queue("screenings", {
        connection: this.redis as any,
        prefix: queuePrefix(),
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
          attempts: 1,
        },
      });
      this.queueInstance.on("error", () => {});
    }
    return this.queueInstance;
  }
  private async ensureQueue() {
    if (this.redis.status === "wait" || this.redis.status === "end")
      await this.redis.connect();
    try {
      await this.queue.waitUntilReady();
    } catch (error) {
      await this.queueInstance?.close().catch(() => {});
      this.queueInstance = undefined;
      throw error;
    }
  }
  private worker?: Worker;
  private workerRedis?: ReturnType<typeof redisConnection>;
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopping = false;
  private recoveryCursor?: string;
  private degraded = false;
  private readonly logger = new Logger(QueueRuntime.name);
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(ScreeningExecution) private readonly execution: ScreeningExecution,
  ) {}
  onModuleInit() {
    if (process.env.NODE_ENV !== "test") {
      this.timer = setInterval(() => {
        void this.tick();
      }, 1000);
      void this.tick();
    }
  }
  startWorker() {
    if (this.worker) return;
    this.workerRedis = redisConnection(true);
    this.worker = new Worker(
      "screenings",
      async (job) => {
        await this.execution.execute(job.data.run_id, job.data.request_id);
        const run = await this.db
          .connection("screening_runs")
          .where({ id: job.data.run_id })
          .first();
        if (run?.status === "failed")
          throw new ExecutionError(run.error_code ?? "screening_failed");
      },
      {
        connection: this.workerRedis as any,
        prefix: queuePrefix(),
        concurrency: 1,
        lockDuration: 240000,
        maxStalledCount: 1,
      },
    );
    this.worker.on("error", () => {});
  }
  async tick() {
    if (this.busy || this.stopping) return;
    this.busy = true;
    try {
      await this.reconcile();
      await this.relay();
      if (this.degraded) this.logger.log("Screening dispatch recovered");
      this.degraded = false;
    } catch {
      if (!this.degraded)
        this.logger.warn(
          "Screening dispatch unavailable; durable work retained",
        );
      this.degraded = true;
    } finally {
      this.busy = false;
    }
  }
  async relay(afterEnqueue?: () => Promise<void>, runIds?: string[]) {
    // A disconnected producer is recreated lazily by ioredis.connect on the next poll.
    await this.ensureQueue();
    for (let i = 0; i < 20; i++) {
      const delivered = await this.db.transaction(async (tx) => {
        const pending = tx("outbox_events").whereNull("delivered_at");
        if (runIds) pending.whereIn("run_id", runIds);
        const event = await pending
          .orderBy("created_at")
          .forUpdate()
          .skipLocked()
          .first();
        if (!event) return false;
        try {
          await this.queue.add("screening", event.payload_json, {
            jobId: `${event.run_id}-${event.delivery_generation}`,
          });
          if (afterEnqueue) await afterEnqueue();
          await tx("outbox_events")
            .where({ id: event.id })
            .update({
              delivered_at: new Date(),
              attempts: event.attempts + 1,
              last_error: null,
            });
        } catch (error) {
          await tx("outbox_events")
            .where({ id: event.id })
            .update({
              attempts: event.attempts + 1,
              last_error: "dispatch_unavailable",
            });
          if (afterEnqueue) throw error;
          return false;
        }
        return true;
      });
      if (!delivered) break;
    }
  }
  async reconcile(runIds?: string[]) {
    const query = this.db.connection("screening_runs").select("id");
    if (runIds) query.whereIn("id", runIds);
    else if (this.recoveryCursor) query.where("id", ">", this.recoveryCursor);
    const rows = await query
      .whereIn("status", ["queued", "running", "retry_wait"])
      .orderBy("id")
      .limit(100);
    if (!runIds)
      this.recoveryCursor =
        rows.length === 100 ? rows[rows.length - 1].id : undefined;
    for (const { id } of rows)
      await this.db.transaction(async (tx) => {
        const run = await tx("screening_runs")
          .where({ id })
          .forUpdate()
          .skipLocked()
          .first();
        if (!run || ["completed", "failed"].includes(run.status)) return;
        if (run.status === "running") {
          if (
            run.lease_expires_at &&
            new Date(run.lease_expires_at).getTime() > Date.now()
          )
            return;
          if (run.attempt_count >= 2) {
            await this.execution.terminal(
              tx,
              run,
              "attempts_exhausted",
              "recovery",
            );
            return;
          }
          await tx("screening_runs")
            .where({ id })
            .update({
              status: "queued",
              lease_expires_at: null,
              attempt_token: null,
              error_code: "lease_expired",
              safe_error_detail: "Worker lease expired",
              attempt_history_json: JSON.stringify([
                ...run.attempt_history_json,
                {
                  attempt: run.attempt_count,
                  code: "lease_expired",
                  finished_at: new Date().toISOString(),
                },
              ]),
            });
        }
        if (
          run.status === "retry_wait" &&
          run.next_retry_at &&
          new Date(run.next_retry_at).getTime() > Date.now()
        )
          return;
        const event = await tx("outbox_events")
          .where({ run_id: id })
          .orderBy("delivery_generation", "desc")
          .first();
        if (event && !event.delivered_at) return;
        if (run.status === "queued" && event) {
          let queued;
          try {
            await this.ensureQueue();
            queued = await this.queue.getJob(
              `${id}-${event.delivery_generation}`,
            );
            if (
              queued &&
              [
                "waiting",
                "active",
                "delayed",
                "prioritized",
                "waiting-children",
              ].includes(await queued.getState())
            )
              return;
          } catch {
            return;
          }
        }
        const generation = (event?.delivery_generation ?? 0) + 1;
        if (run.status === "retry_wait")
          await tx("screening_runs")
            .where({ id })
            .update({ status: "queued", next_retry_at: null });
        await tx("outbox_events")
          .insert({
            kind: "screening",
            run_id: id,
            delivery_generation: generation,
            payload_json: {
              run_id: id,
              request_id: event?.payload_json.request_id ?? "recovery",
            },
          })
          .onConflict(["run_id", "delivery_generation"])
          .ignore();
      });
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    this.workerRedis?.disconnect();
    if (this.queueInstance) {
      await this.queueInstance.waitUntilReady().catch(() => {});
      await this.queueInstance.close();
    }
    this.redis.disconnect();
  }
}
