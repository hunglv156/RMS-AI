import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { hash, verify, argon2id } from "argon2";
import { z } from "zod";
import { Database } from "../db/database";
import { AuditWriter } from "../audit/audit-writer.service";
import { PlatformError } from "../common/errors";
import { allowedActions } from "./authorization.service";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const csrfFor = (s: string) => digest("csrf:" + s);
export const publicUser = (u: any) => ({
  id: u.id,
  normalized_email: u.normalized_email,
  display_name: u.display_name,
  role: u.role,
  disabled_at: u.disabled_at,
  created_at: u.created_at,
});
export const passwordSchema = z.string().min(12).max(128);
export const passwordHash = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
export function parseInput<T>(
  schema: z.ZodType<T, z.ZodTypeDef, any>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new PlatformError("invalid_input", "Invalid request input", 400);
  return result.data;
}
@Injectable()
export class AuthService {
  private dummy = passwordHash("dummy-password-never-used");
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  async security(
    action: string,
    requestId: string,
    actorId: string | null = null,
  ) {
    await this.db.transaction((tx) =>
      this.audit.append(tx, {
        actor_id: actorId,
        actor_type: actorId ? "user" : "system",
        action,
        resource_type: "session",
        resource_id: actorId ?? "anonymous",
        request_id: requestId,
        safe_metadata_json: {},
      }),
    );
  }
  async login(
    input: unknown,
    ip: string,
    requestId: string,
    oldToken?: string,
  ) {
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.until <= now) this.attempts.delete(key);
    const bucket = this.attempts.get(ip) ?? { count: 0, until: now + 900000 };
    if (this.attempts.size >= 10000 || bucket.count >= 10) {
      await this.security("auth.throttled", requestId);
      throw new PlatformError("login_throttled", "Try again later", 429);
    }
    bucket.count++;
    this.attempts.set(ip, bucket);
    const data = parseInput(
      z
        .object({
          email: z.string().trim().email().max(254),
          password: z.string().min(1).max(128),
        })
        .strict(),
      input,
    );
    const user = await this.db
      .connection("users")
      .where({ normalized_email: data.email.toLowerCase() })
      .first();
    let valid = false;
    try {
      valid = await verify(
        user?.password_hash ?? (await this.dummy),
        data.password,
      );
    } catch {
      /* Invalid hashes fail closed. */
    }
    if (!user || !valid || user.disabled_at) {
      await this.security("auth.login_failed", requestId);
      throw new PlatformError(
        "invalid_credentials",
        "Invalid credentials",
        401,
      );
    }
    const token = randomBytes(32).toString("hex"),
      expires = new Date(now + 8 * 3600000);
    await this.db.transaction(async (tx) => {
      const current = await tx("users")
        .where({ id: user.id })
        .forUpdate()
        .first();
      if (current.disabled_at || current.password_hash !== user.password_hash)
        throw new PlatformError(
          "invalid_credentials",
          "Invalid credentials",
          401,
        );
      if (oldToken)
        await tx("sessions")
          .where({ token_hash: digest(oldToken) })
          .delete();
      await tx("sessions").insert({
        user_id: user.id,
        token_hash: digest(token),
        csrf_token_hash: digest(csrfFor(token)),
        expires_at: expires,
      });
      await this.audit.append(tx, {
        actor_id: user.id,
        actor_type: "user",
        action: "auth.login",
        resource_type: "user",
        resource_id: user.id,
        request_id: requestId,
        safe_metadata_json: {},
      });
    });
    return {
      token,
      session: {
        user: publicUser(user),
        allowed_actions: allowedActions(user),
        csrf_token: csrfFor(token),
        expires_at: expires.toISOString(),
      },
    };
  }
  async authenticate(token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new PlatformError(
        "unauthenticated",
        "Authentication required",
        401,
      );
    const row = await this.db
      .connection("sessions as s")
      .join("users as u", "u.id", "s.user_id")
      .select("u.*", "s.id as session_id", "s.expires_at", "s.csrf_token_hash")
      .where("s.token_hash", digest(token))
      .where("s.expires_at", ">", new Date())
      .whereNull("u.disabled_at")
      .first();
    if (!row)
      throw new PlatformError(
        "unauthenticated",
        "Authentication required",
        401,
      );
    await this.db
      .connection("sessions")
      .where({ id: row.session_id })
      .update({ last_seen_at: new Date() });
    return row;
  }
  async logout(token: string, actorId: string, requestId: string) {
    await this.db.transaction(async (tx) => {
      await tx("sessions")
        .where({ token_hash: digest(token) })
        .delete();
      await this.audit.append(tx, {
        actor_id: actorId,
        actor_type: "user",
        action: "auth.logout",
        resource_type: "user",
        resource_id: actorId,
        request_id: requestId,
        safe_metadata_json: {},
      });
    });
  }
}
