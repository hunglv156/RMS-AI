import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthService, csrfFor, publicUser } from "./auth.service";
import { allowedActions } from "./authorization.service";
import {
  COOKIE,
  secureCookie,
  tokenFrom,
  type AuthRequest,
} from "./auth.guard";
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      body,
      req.ip ?? "unknown",
      String(res.getHeader("X-Request-ID")),
      tokenFrom(req),
    );
    res.setHeader("Cache-Control", "no-store");
    res.cookie(COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: secureCookie(),
      maxAge: 8 * 3600000,
    });
    return result.session;
  }
  @Get("me")
  me(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return {
      user: publicUser(req.sessionUser),
      allowed_actions: allowedActions(req.actor),
      csrf_token: csrfFor(req.sessionToken),
      expires_at: new Date(req.sessionUser.expires_at).toISOString(),
    };
  }
  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(
      req.sessionToken,
      req.actor.id,
      String(res.getHeader("X-Request-ID")),
    );
    res.clearCookie(COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: secureCookie(),
    });
  }
}
