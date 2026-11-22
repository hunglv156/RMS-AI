import { Module } from "@nestjs/common";
import { HealthController } from "./common/health";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AuditModule } from "./audit/audit.module";
import { JobsModule } from "./jobs/jobs.module";
import { JdVersionsModule } from "./jd-versions/jd-versions.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { ResumesModule } from "./resumes/resumes.module";
import { ApplicationsModule } from "./applications/applications.module";
import { ScreeningsModule } from "./screenings/screenings.module";
import { QueuesModule } from "./queues/queues.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { DashboardModule } from "./dashboard/dashboard.module";
@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    AuditModule,
    JobsModule,
    JdVersionsModule,
    CandidatesModule,
    ResumesModule,
    ApplicationsModule,
    ScreeningsModule,
    QueuesModule,
    ReviewsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
