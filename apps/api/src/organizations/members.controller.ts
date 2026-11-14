import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { updateMemberSchema, type UpdateMemberInput } from '@rms/contracts';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { MembersService } from './members.service';

@Controller('organizations/:orgId/members')
export class MembersController {
  constructor(@Inject(MembersService) private readonly members: MembersService) {}

  @Get() @RequirePermission('job:read')
  list(@Param('orgId', ParseUUIDPipe) orgId: string) {
    this.members.assertOrg(orgId);
    return this.members.list();
  }

  @Patch(':membershipId') @RequirePermission('membership:write')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body(new ZodPipe(updateMemberSchema)) body: UpdateMemberInput,
  ) {
    this.members.assertOrg(orgId);
    return this.members.update(membershipId, body);
  }
}
