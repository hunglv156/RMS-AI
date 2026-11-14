import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import {
  loginSchema, refreshSchema, registerSchema, switchOrgSchema,
  type LoginInput, type RegisterInput,
} from '@rms/contracts';
import type { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';
import type { AuthedRequest } from './auth.guard';
import { NoTenant, Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public() @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Public() @Post('login') @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Public() @Post('refresh') @HttpCode(200)
  refresh(@Body(new ZodPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    return this.auth.refresh(body.refresh_token);
  }

  @Public() @Post('logout') @HttpCode(204)
  async logout(@Body(new ZodPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    await this.auth.logout(body.refresh_token);
  }

  @NoTenant() @Post('switch-org') @HttpCode(200)
  switchOrg(
    @Req() req: AuthedRequest,
    @Body(new ZodPipe(switchOrgSchema)) body: z.infer<typeof switchOrgSchema>,
  ) {
    return this.auth.switchOrg(req.auth!.userId, body.organization_id, body.refresh_token);
  }
}
