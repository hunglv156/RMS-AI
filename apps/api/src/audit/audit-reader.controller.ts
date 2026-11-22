import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { AuditReaderService } from "./audit-reader.service";
@Controller("audit-events")
export class AuditReaderController {
  constructor(
    @Inject(AuditReaderService) private readonly service: AuditReaderService,
  ) {}
  @Get() @RequireAction("audit.read") list(
    @Req() req: AuthRequest,
    @Query() query: unknown,
  ) {
    return this.service.list(req.actor, query);
  }
}
