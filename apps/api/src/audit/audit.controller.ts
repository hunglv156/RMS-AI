import { Controller, Get, Inject, Query } from '@nestjs/common';
import { pageQuerySchema } from '@rms/contracts';
import type { z } from 'zod';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { AuditService } from './audit.service';

@Controller('audit-events')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get() @RequirePermission('audit:read')
  list(@Query(new ZodPipe(pageQuerySchema)) q: z.infer<typeof pageQuerySchema>) {
    return this.audit.list(q.page, q.page_size);
  }
}
