import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ResumesModule } from "../resumes/resumes.module";
import { AiAdapter } from "./ai-adapter";
import { ScreeningsService } from "./screenings.service";
import { ScreeningsController } from "./screenings.controller";
import { ScreeningExecution } from "./execution.service";
@Module({
  imports: [AuthModule, AuditModule, ResumesModule],
  controllers: [ScreeningsController],
  providers: [AiAdapter, ScreeningsService, ScreeningExecution],
  exports: [AiAdapter, ScreeningsService, ScreeningExecution],
})
export class ScreeningsModule {}
