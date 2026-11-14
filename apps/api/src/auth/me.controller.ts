import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { AuthedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { NoTenant } from './decorators';

@Controller('me')
export class MeController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @NoTenant() @Get()
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.auth!.userId, req.auth!.organizationId);
  }
}
