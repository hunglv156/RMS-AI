import { Controller, Get, Inject, Module, Post } from '@nestjs/common';
import { RequirePermission } from '../../src/auth/decorators';
import { TenantContext } from '../../src/tenant/tenant-context';

/** Route chỉ dùng trong test để thử guard/interceptor mà chưa cần module nghiệp vụ. */
@Controller('probe')
class ProbeController {
  constructor(@Inject(TenantContext) private readonly tenant: TenantContext) {}

  @Get('read') @RequirePermission('job:read')
  read() {
    const { organizationId, role } = this.tenant.current();
    return { organizationId, role };
  }

  @Post('write') @RequirePermission('job:write')
  write() {
    return { ok: true };
  }

  @Post('fail-after-write') @RequirePermission('job:write')
  async failAfterWrite() {
    const { trx, organizationId, userId } = this.tenant.current();
    await trx.insertInto('audit_events').values({
      organization_id: organizationId, actor_id: userId, action: 'probe', resource_type: 'probe',
      resource_id: null, metadata_json: '{}',
    }).execute();
    throw new Error('boom');
  }

  @Get('undeclared')
  undeclared() {
    return { shouldNotReach: true };
  }
}

@Module({ controllers: [ProbeController] })
export class ProbeModule {}
