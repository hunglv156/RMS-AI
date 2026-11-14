import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { MeController } from './auth/me.controller';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { APP_CONFIG, loadConfig, type ConfigOverrides } from './config';
import { DatabaseService } from './db/database.service';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { CandidatesController } from './candidates/candidates.controller';
import { CandidatesService } from './candidates/candidates.service';
import { JdController } from './jd/jd.controller';
import { JdService } from './jd/jd.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { MembersController } from './organizations/members.controller';
import { MembersService } from './organizations/members.service';
import { ResumesController } from './resumes/resumes.controller';
import { ResumesService } from './resumes/resumes.service';
import { S3Service } from './storage/s3.service';
import { AiClient } from './pipeline/ai-client';
import { DocumentPipeline } from './pipeline/document-pipeline.service';
import { OutboxService } from './pipeline/outbox.service';
import { PipelineRuntime } from './pipeline/pipeline-runtime';
import { TenantRunner } from './pipeline/tenant-runner';
import { HealthController } from './health.controller';
import { TenantContext } from './tenant/tenant-context';
import { TenantInterceptor } from './tenant/tenant.interceptor';

@Module({})
export class AppModule {
  static forRoot(overrides: ConfigOverrides = {}): DynamicModule {
    const config = loadConfig(overrides);
    return {
      module: AppModule,
      global: true,
      imports: [JwtModule.register({ secret: config.jwtSecret, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } })],
      controllers: [
        HealthController, AuthController, MeController, JobsController, CandidatesController,
        MembersController, AuditController, ResumesController, JdController,
      ],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        DatabaseService,
        TenantContext,
        AuthService,
        AuditService,
        JobsService,
        JdService,
        CandidatesService,
        MembersService,
        S3Service,
        AiClient,
        TenantRunner,
        OutboxService,
        DocumentPipeline,
        PipelineRuntime,
        ResumesService,
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
      exports: [DatabaseService, TenantContext, APP_CONFIG, PipelineRuntime, OutboxService],
    };
  }
}
