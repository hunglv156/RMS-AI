import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  createJobSchema, listQuerySchema, updateJobSchema,
  type CreateJobInput, type ListQuery, type UpdateJobInput,
} from '@rms/contracts';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Get() @RequirePermission('job:read')
  list(@Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.jobs.list(q);
  }

  @Post() @RequirePermission('job:write')
  create(@Body(new ZodPipe(createJobSchema)) body: CreateJobInput) {
    return this.jobs.create(body);
  }

  @Get(':jobId') @RequirePermission('job:read')
  get(@Param('jobId', ParseUUIDPipe) id: string) {
    return this.jobs.get(id);
  }

  @Patch(':jobId') @RequirePermission('job:write')
  update(@Param('jobId', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateJobSchema)) body: UpdateJobInput) {
    return this.jobs.update(id, body);
  }
}
