import {
  CallHandler, ExecutionContext, ForbiddenException, Inject, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, type Permission, type Role } from '@rms/contracts';
import { lastValueFrom, from, type Observable } from 'rxjs';
import { sql } from 'kysely';
import type { AuthedRequest } from '../auth/auth.guard';
import { IS_PUBLIC, NO_TENANT, REQUIRED_PERMISSION } from '../auth/decorators';
import { DatabaseService } from '../db/database.service';
import { TenantContext } from './tenant-context';

/**
 * Mở transaction cho mỗi request tenant, `SET LOCAL app.organization_id`, kiểm tra lại membership
 * phía server rồi mới kiểm tra quyền theo action. Mọi lỗi đều rollback.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(TenantContext) private readonly tenant: TenantContext,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ||
      this.reflector.getAllAndOverride<boolean>(NO_TENANT, targets)
    ) {
      return next.handle();
    }
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const principal = req.auth;
    if (!principal?.organizationId) {
      throw new ForbiddenException('Chưa chọn tổ chức đang hoạt động');
    }
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION, targets);
    if (!permission) {
      throw new ForbiddenException('Route chưa khai báo quyền (mặc định từ chối)');
    }
    const { userId, organizationId } = principal;

    return from(
      this.db.kysely.transaction().execute(async (trx) => {
        await sql`SELECT set_config('app.organization_id', ${organizationId}, true)`.execute(trx);
        const m = await trx
          .selectFrom('memberships')
          .select(['role', 'status'])
          .where('organization_id', '=', organizationId)
          .where('user_id', '=', userId)
          .executeTakeFirst();
        if (!m || m.status !== 'active') {
          throw new ForbiddenException('Bạn không thuộc tổ chức này');
        }
        const role: Role = m.role;
        if (!can(role, permission)) {
          throw new ForbiddenException(`Vai trò ${role} không có quyền ${permission}`);
        }
        return this.tenant.run({ trx, organizationId, userId, role }, () => lastValueFrom(next.handle(), { defaultValue: undefined }));
      }),
    );
  }
}
