import { Body, Controller, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { createScreeningSchema, type CreateScreeningInput } from '@rms/contracts';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { ScreeningsService } from './screenings.service';

@Controller('jobs/:jobId/screenings')
export class ScreeningsController {
  constructor(@Inject(ScreeningsService) private readonly screenings: ScreeningsService) {}

  @Post() @HttpCode(202) @RequirePermission('screening:run')
  create(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body(new ZodPipe(createScreeningSchema)) body: CreateScreeningInput,
  ) {
    return this.screenings.create(jobId, body.application_id, key);
  }

  @Get() @RequirePermission('screening:read')
  list(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.screenings.list(jobId);
  }

  @Get(':runId') @RequirePermission('screening:read')
  get(@Param('jobId', ParseUUIDPipe) jobId: string, @Param('runId', ParseUUIDPipe) runId: string) {
    return this.screenings.get(jobId, runId);
  }
}
