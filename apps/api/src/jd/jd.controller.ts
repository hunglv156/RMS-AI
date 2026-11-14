import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import {
  createApplicationSchema, createJdVersionSchema, putCriteriaSchema,
  type CreateApplicationInput, type CreateJdVersionInput, type PutCriteriaInput,
} from '@rms/contracts';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { JdService } from './jd.service';

@Controller('jobs/:jobId')
export class JdController {
  constructor(@Inject(JdService) private readonly jd: JdService) {}

  @Get('jd/versions') @RequirePermission('job:read')
  list(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.jd.list(jobId);
  }

  @Post('jd/versions') @RequirePermission('jd:write')
  create(@Param('jobId', ParseUUIDPipe) jobId: string, @Body(new ZodPipe(createJdVersionSchema)) body: CreateJdVersionInput) {
    return this.jd.create(jobId, body);
  }

  @Get('jd/versions/:versionId') @RequirePermission('job:read')
  get(@Param('jobId', ParseUUIDPipe) jobId: string, @Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.jd.get(jobId, versionId);
  }

  @Put('jd/versions/:versionId/criteria') @RequirePermission('jd:write')
  putCriteria(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body(new ZodPipe(putCriteriaSchema)) body: PutCriteriaInput,
  ) {
    return this.jd.putCriteria(jobId, versionId, body);
  }

  @Post('jd/versions/:versionId/approve') @HttpCode(200) @RequirePermission('jd:approve')
  approve(@Param('jobId', ParseUUIDPipe) jobId: string, @Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.jd.approve(jobId, versionId);
  }

  @Get('applications') @RequirePermission('job:read')
  applications(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.jd.listApplications(jobId);
  }

  @Post('applications') @RequirePermission('application:write')
  createApplication(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body(new ZodPipe(createApplicationSchema)) body: CreateApplicationInput,
  ) {
    return this.jd.createApplication(jobId, body);
  }
}
