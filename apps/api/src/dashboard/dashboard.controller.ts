import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { DashboardService } from "./dashboard.service";
@Controller("dashboard")
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly service: DashboardService,
  ) {}
  @Get() @RequireAction("dashboard.read") get(@Req() req: AuthRequest) {
    return this.service.get(req.actor);
  }
}
