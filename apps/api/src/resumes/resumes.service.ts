import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { actorJoin } from "../common/display";
import { Database } from "../db/database";
import { AuditWriter } from "../audit/audit-writer.service";
import { JobAuthorization, assertId } from "../auth/authorization.service";
import type { Actor, StoredResume } from "../common/interfaces";
import { FilesystemResumeStorage } from "./filesystem.storage";
import { notFound } from "../candidates/candidates.service";
export function publicResume(row: any) {
  const { storage_key: _, ...safe } = row;
  return { ...safe, byte_size: Number(safe.byte_size) };
}
@Injectable()
export class ResumesService implements OnApplicationBootstrap, OnModuleDestroy {
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger(ResumesService.name);
  onApplicationBootstrap() {
    const cleanup = () => {
      void this.reconcile().catch(() =>
        this.logger.warn("Private resume reconciliation failed"),
      );
    };
    cleanup();
    this.cleanupTimer = setInterval(cleanup, 3600000);
    this.cleanupTimer.unref();
  }
  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(FilesystemResumeStorage)
    private readonly storage: FilesystemResumeStorage,
  ) {}
  async create(
    actor: Actor,
    candidateId: string,
    file: StoredResume,
    filename: string,
    requestId: string,
  ) {
    try {
      this.policy.assertAction(actor, "resumes.create");
      assertId(candidateId);
      return await this.db.transaction(async (tx) => {
        // Candidate row serializes concurrent version allocations.
        if (
          !(await tx("candidates")
            .where({ id: candidateId })
            .forUpdate()
            .first())
        )
          throw notFound();
        const last = await tx("resumes")
          .where({ candidate_id: candidateId })
          .max("version_no as version")
          .first();
        const [row] = await tx("resumes")
          .insert({
            candidate_id: candidateId,
            version_no: Number(last?.version ?? 0) + 1,
            storage_key: file.storageKey,
            original_filename: filename,
            mime_type: "application/pdf",
            byte_size: file.byteSize,
            file_sha256: file.fileSha256,
            uploaded_by: actor.id,
          })
          .returning("*");
        await this.audit.append(tx, {
          actor_id: actor.id,
          actor_type: "user",
          action: "resume.uploaded",
          resource_type: "resume",
          resource_id: row.id,
          request_id: requestId,
          safe_metadata_json: {},
        });
        return publicResume(
          await actorJoin(
            tx("resumes").select("resumes.*"),
            "resumes.uploaded_by",
            "uploaded_by_actor",
          )
            .where("resumes.id", row.id)
            .first(),
        );
      });
    } catch (error) {
      await this.storage.remove(file.storageKey);
      throw error;
    } finally {
      this.storage.release(file.storageKey);
    }
  }
  async download(actor: Actor, id: string, requestId: string) {
    this.policy.assertAction(actor, "resumes.read");
    const row = await this.db.transaction(async (tx) => {
      await this.policy.assertResourceAccess(actor, "resume", id, tx);
      const record = await tx("resumes").where({ id }).first();
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "resume.download_authorized",
        resource_type: "resume",
        resource_id: id,
        request_id: requestId,
        safe_metadata_json: {},
      });
      return record;
    });
    try {
      return {
        stream: await this.storage.open(row.storage_key),
        filename: row.original_filename,
      };
    } catch {
      throw notFound();
    }
  }
  async reconcile(olderThan = new Date(Date.now() - 3600000)) {
    const rows = await this.db.connection("resumes").select("storage_key");
    return this.storage.reconcile(
      new Set(rows.map((r) => r.storage_key)),
      olderThan,
    );
  }
}
