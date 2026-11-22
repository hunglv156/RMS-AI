import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AUTHORIZATION_POLICY } from "../common/interfaces";
import { AuditModule } from "../audit/audit.module";
import { AuthService } from "./auth.service";
import { JobAuthorization } from "./authorization.service";
import { SessionGuard } from "./auth.guard";
import { AuthController } from "./auth.controller";
@Global()
@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JobAuthorization,
    { provide: AUTHORIZATION_POLICY, useExisting: JobAuthorization },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AuthService, JobAuthorization, AUTHORIZATION_POLICY],
})
export class AuthModule {}
