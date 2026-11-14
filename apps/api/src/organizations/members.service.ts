import {
  BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import type { MemberDto, Page, UpdateMemberInput } from '@rms/contracts';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../tenant/tenant-context';

@Injectable()
export class MembersService {
  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** orgId trên URL phải trùng tổ chức đang active; khác thì coi như không tồn tại. */
  assertOrg(orgId: string): void {
    if (this.tenant.current().organizationId !== orgId) throw new NotFoundException('Không tìm thấy tổ chức');
  }

  async list(): Promise<Page<MemberDto>> {
    const { trx, organizationId } = this.tenant.current();
    const rows = await trx.selectFrom('memberships')
      .innerJoin('users', 'users.id', 'memberships.user_id')
      .select(['memberships.id', 'memberships.user_id', 'memberships.role', 'memberships.status',
        'users.email', 'users.display_name'])
      .where('memberships.organization_id', '=', organizationId)
      .orderBy('users.email').execute();
    return { items: rows, page: 1, page_size: rows.length, total: rows.length };
  }

  async update(membershipId: string, input: UpdateMemberInput): Promise<MemberDto> {
    const { trx, organizationId, role: actorRole } = this.tenant.current();
    const current = await trx.selectFrom('memberships').select(['id', 'role', 'status'])
      .where('organization_id', '=', organizationId).where('id', '=', membershipId)
      .forUpdate().executeTakeFirst();
    if (!current) throw new NotFoundException('Không tìm thấy thành viên');

    // Chỉ owner được cấp, thu hồi hoặc khoá vai trò owner.
    const touchesOwner = current.role === 'owner' || input.role === 'owner';
    if (touchesOwner && actorRole !== 'owner') {
      throw new ForbiddenException('Chỉ Owner được thay đổi vai trò Owner');
    }
    const losesOwner = current.role === 'owner' &&
      ((input.role && input.role !== 'owner') || input.status === 'suspended');
    if (losesOwner) {
      const owners = await trx.selectFrom('memberships').select('id')
        .where('organization_id', '=', organizationId).where('role', '=', 'owner')
        .where('status', '=', 'active').forUpdate().execute();
      if (owners.length <= 1) throw new BadRequestException('Không thể gỡ Owner cuối cùng');
    }
    await trx.updateTable('memberships').set(input)
      .where('organization_id', '=', organizationId).where('id', '=', membershipId).execute();
    await this.audit.record('membership.update', 'membership', membershipId, {
      from: { role: current.role, status: current.status }, to: input,
    });
    const rows = (await this.list()).items;
    return rows.find((m) => m.id === membershipId) as MemberDto;
  }
}
