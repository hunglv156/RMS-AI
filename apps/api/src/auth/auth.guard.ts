import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC, type AuthPrincipal } from './decorators';

export type AuthedRequest = Request & { auth?: AuthPrincipal; correlationId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Thiếu access token');
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; org_id?: string | null; typ?: string }>(token);
      if (claims.typ !== 'access') throw new Error('wrong token type');
      // Chỉ lấy danh tính và org đang active từ token; role luôn đọc lại từ membership.
      req.auth = { userId: claims.sub, organizationId: claims.org_id ?? null };
      return true;
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn');
    }
  }
}
