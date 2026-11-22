import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { JobsService } from "./jobs.service";
export const requestId = (req: AuthRequest) =>
  String(req.res?.getHeader("X-Request-ID"));
@Controller("jobs")
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}
  @Get() @RequireAction("jobs.read") list(
    @Req() req: AuthRequest,
    @Query() query: unknown,
  ) {
    return this.jobs.list(req.actor, query);
  }
  @Post() @RequireAction("jobs.create") create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.jobs.create(req.actor, body, requestId(req));
  }
  @Get(":id") @RequireAction("jobs.read") get(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.jobs.get(req.actor, id);
  }
  @Patch(":id") @RequireAction("jobs.update") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.jobs.update(req.actor, id, body, requestId(req));
  }
  @Put(":id/assignments") @RequireAction("jobs.assign") assign(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.jobs.assign(req.actor, id, body, requestId(req));
  }
}
