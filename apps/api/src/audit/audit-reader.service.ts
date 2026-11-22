import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { Database } from "../db/database";
import { JobAuthorization } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import type { Actor } from "../common/interfaces";
import { reviewPageSchema } from "../reviews/reviews.service";
const schema = reviewPageSchema
  .extend({
    action: z.string().min(1).max(200).optional(),
    resource_type: z.string().min(1).max(200).optional(),
    resource_id: z.string().min(1).max(200).optional(),
    job_id: z.string().uuid().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .refine((v) => !v.from || !v.to || Date.parse(v.from) <= Date.parse(v.to));
@Injectable()
export class AuditReaderService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
  ) {}
  async list(actor: Actor, input: unknown) {
    this.policy.assertAction(actor, "audit.read");
    const p = parseInput(schema, input);
    const q = this.db.connection("audit_events");
    for (const k of [
      "action",
      "resource_type",
      "resource_id",
      "job_id",
    ] as const)
      if (p[k]) q.where(k, p[k]);
    if (p.from) q.where("created_at", ">=", p.from);
    if (p.to) q.where("created_at", "<=", p.to);
    const [rows, count] = await Promise.all([
      q
        .clone()
        .orderBy("created_at", p.sort === "created_at" ? "asc" : "desc")
        .orderBy("id", p.sort === "created_at" ? "asc" : "desc")
        .limit(p.pageSize)
        .offset((p.page - 1) * p.pageSize),
      q.clone().count("* as total").first(),
    ]);
    const items = rows.map(({ safe_metadata_json, ...row }) => ({
      ...row,
      id: String(row.id),
      safe_metadata: safe_metadata_json,
    }));
    return {
      items,
      total: Number(count?.total),
      page: p.page,
      pageSize: p.pageSize,
    };
  }
}
