import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthService, digest } from "./auth.service";
import { ACTION, JobAuthorization } from "./authorization.service";
import { PlatformError } from "../common/errors";
export const COOKIE = "rms_session";
export type AuthRequest = Request & {
  actor: { id: string; role: "admin" | "recruiter" | "reviewer" };
  sessionUser: any;
  sessionToken: string;
};
export function tokenFrom(req: Request): string | undefined {
  const match = (req.headers.cookie ?? "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(COOKIE + "="));
  return match?.slice(COOKIE.length + 1);
}
export function browserOrigin(): URL {
  const origin = new URL(process.env.APP_ORIGIN ?? "http://localhost:5173");
  if (
    origin.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  )
    throw new Error("APP_ORIGIN requires HTTPS outside localhost");
  return origin;
}
export const secureCookie = () => browserOrigin().protocol === "https:";
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const requestId = String(
      ctx.switchToHttp().getResponse().getHeader("X-Request-ID"),
    );
    if (req.path === "/health/live" || req.path === "/health/ready")
      return true;
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const checkOrigin = async () => {
      if (req.headers.origin === browserOrigin().origin) return;
      await this.auth.security("auth.origin_denied", requestId);
      throw new PlatformError("invalid_origin", "Origin forbidden", 403);
    };
    if (req.path === "/api/v1/auth/login" && req.method === "POST") {
      await checkOrigin();
      return true;
    }
    const token = tokenFrom(req);
    let user;
    try {
      user = await this.auth.authenticate(token);
    } catch (error) {
      await this.auth.security("auth.session_denied", requestId);
      throw error;
    }
    ctx.switchToHttp().getResponse().setHeader("Cache-Control", "no-store");
    req.actor = { id: user.id, role: user.role };
    req.sessionUser = user;
    req.sessionToken = token!;
    if (mutation) await checkOrigin();
    if (
      mutation &&
      (typeof req.headers["x-csrf-token"] !== "string" ||
        digest(req.headers["x-csrf-token"]) !== user.csrf_token_hash)
    ) {
      await this.auth.security("auth.csrf_denied", requestId, user.id);
      throw new PlatformError("invalid_csrf", "CSRF token required", 403);
    }
    if (req.path === "/api/v1/auth/me" || req.path === "/api/v1/auth/logout")
      return true;
    const action = this.reflector.getAllAndOverride<string>(ACTION, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    try {
      this.policy.assertAction(req.actor, action ?? "");
    } catch (error) {
      await this.auth.security("auth.action_denied", requestId, user.id);
      throw error;
    }
    return true;
  }
}
