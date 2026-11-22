import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Actor } from "../common/interfaces";
import { Database } from "../db/database";
import { AuditWriter } from "../audit/audit-writer.service";
import { JobAuthorization, assertId } from "../auth/authorization.service";
import {
  parseInput,
  passwordSchema,
  passwordHash,
  publicUser,
} from "../auth/auth.service";
import { PlatformError } from "../common/errors";
const role = z.enum(["admin", "recruiter", "reviewer"]);
const name = z.string().trim().min(1).max(200);
@Injectable()
export class UsersService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
  ) {}
  async list(actor: Actor, query: unknown) {
    this.policy.assertAction(actor, "users.read");
    const { page, pageSize } = parseInput(
      z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      }),
      query,
    );
    const [rows, total] = await Promise.all([
      this.db
        .connection("users")
        .select(
          "id",
          "normalized_email",
          "display_name",
          "role",
          "disabled_at",
          "created_at",
        )
        .orderBy("created_at")
        .orderBy("id")
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.connection("users").count("* as count").first(),
    ]);
    return { items: rows, total: Number(total?.count), page, pageSize };
  }
  async create(actor: Actor, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "users.create");
    const data = parseInput(
      z
        .object({
          email: z.string().trim().email().max(254),
          display_name: name,
          role,
          password: passwordSchema,
        })
        .strict(),
      input,
    );
    const password_hash = await passwordHash(data.password);
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx("users")
          .insert({
            normalized_email: data.email.toLowerCase(),
            display_name: data.display_name,
            role: data.role,
            password_hash,
          })
          .returning("*");
        await this.audit.append(tx, {
          actor_id: actor.id,
          actor_type: "user",
          action: "user.created",
          resource_type: "user",
          resource_id: user.id,
          request_id: requestId,
          safe_metadata_json: { role: data.role },
        });
        return publicUser(user);
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new PlatformError("email_exists", "Account already exists", 409);
      throw error;
    }
  }
  async update(actor: Actor, id: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "users.update");
    assertId(id);
    const data = parseInput(
      z
        .object({
          role: role.optional(),
          disabled: z.boolean().optional(),
          password: passwordSchema.optional(),
          display_name: name.optional(),
        })
        .strict()
        .refine((v) => Object.keys(v).length > 0),
      input,
    );
    const password_hash = data.password
      ? await passwordHash(data.password)
      : undefined;
    return this.db.transaction(async (tx) => {
      // Serialize all account changes, including simultaneous demotions of distinct admins.
      await tx.raw("SELECT pg_advisory_xact_lock(8202)");
      const user = await tx("users").where({ id }).forUpdate().first();
      if (!user) throw new PlatformError("not_found", "Record not found", 404);
      if (
        user.role === "admin" &&
        !user.disabled_at &&
        (data.disabled === true || (data.role && data.role !== "admin"))
      ) {
        const other = await tx("users")
          .where({ role: "admin" })
          .whereNull("disabled_at")
          .whereNot({ id })
          .first();
        if (!other)
          throw new PlatformError(
            "last_admin",
            "The last active admin must remain active",
            409,
          );
      }
      const changes: Record<string, unknown> = {};
      if (data.role) changes.role = data.role;
      if (data.disabled !== undefined)
        changes.disabled_at = data.disabled ? new Date() : null;
      if (data.display_name !== undefined)
        changes.display_name = data.display_name;
      if (password_hash) changes.password_hash = password_hash;
      const [updated] = await tx("users")
        .where({ id })
        .update(changes)
        .returning("*");
      if (data.disabled === true || password_hash)
        await tx("sessions").where({ user_id: id }).delete();
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "user.updated",
        resource_type: "user",
        resource_id: id,
        request_id: requestId,
        safe_metadata_json: {
          changed_fields: Object.keys(data),
          ...(data.role ? { role: data.role, previous_role: user.role } : {}),
          ...(data.disabled !== undefined ? { disabled: data.disabled } : {}),
        },
      });
      return publicUser(updated);
    });
  }
}
