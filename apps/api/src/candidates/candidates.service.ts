import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { Database } from "../db/database";
import { AuditWriter } from "../audit/audit-writer.service";
import { JobAuthorization, assertId } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import type { Actor } from "../common/interfaces";
import { PlatformError } from "../common/errors";
export const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});
const candidateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(254).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    provenance: z.enum(["synthetic", "demo_public"]),
  })
  .strict();
export const notFound = () =>
  new PlatformError("not_found", "Record not found", 404);
@Injectable()
export class CandidatesService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
  ) {}
  async list(actor: Actor, input: unknown) {
    this.policy.assertAction(actor, "candidates.read");
    const { page, pageSize, search } = parseInput(pageSchema, input);
    const query = this.db.connection("candidates");
    if (search)
      query.whereILike(
        "display_name",
        `%${search.replace(/[\\%_]/g, "\\$&")}%`,
      );
    const [items, count] = await Promise.all([
      query
        .clone()
        .orderBy("created_at", "desc")
        .orderBy("id")
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      query.clone().count("* as total").first(),
    ]);
    return { items, total: Number(count?.total), page, pageSize };
  }
  async get(actor: Actor, id: string) {
    this.policy.assertAction(actor, "candidates.read");
    assertId(id);
    const row = await this.db.connection("candidates").where({ id }).first();
    if (!row) throw notFound();
    return row;
  }
  async create(actor: Actor, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "candidates.create");
    const data = parseInput(candidateSchema, input);
    return this.db.transaction(async (tx) => {
      const [row] = await tx("candidates")
        .insert({ ...data, created_by: actor.id })
        .returning("*");
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "candidate.created",
        resource_type: "candidate",
        resource_id: row.id,
        request_id: requestId,
        safe_metadata_json: {},
      });
      return row;
    });
  }
  async update(actor: Actor, id: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "candidates.update");
    assertId(id);
    const data = parseInput(
      candidateSchema.partial().refine((v) => Object.keys(v).length > 0),
      input,
    );
    return this.db.transaction(async (tx) => {
      const [row] = await tx("candidates")
        .where({ id })
        .update({ ...data, updated_at: new Date() })
        .returning("*");
      if (!row) throw notFound();
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "candidate.updated",
        resource_type: "candidate",
        resource_id: id,
        request_id: requestId,
        safe_metadata_json: {},
      });
      return row;
    });
  }
}
