import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { requestId } from "../jobs/jobs.controller";
import { JdVersionsService } from "./jd-versions.service";
@Controller()
export class JdVersionsController {
  constructor(
    @Inject(JdVersionsService) private readonly versions: JdVersionsService,
  ) {}
  @Get("jobs/:id/jd-versions") @RequireAction("jd.read") list(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.versions.list(req.actor, id, query);
  }
  @Post("jobs/:id/jd-versions") @RequireAction("jd.create") create(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.create(req.actor, id, body, requestId(req));
  }
  @Get("jd-versions/:id") @RequireAction("jd.read") get(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.versions.get(req.actor, id);
  }
  @Patch("jd-versions/:id") @RequireAction("jd.update") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.mutate(req.actor, id, "update", body, requestId(req));
  }
  @Post("jd-versions/:id/submit")
  @HttpCode(200)
  @RequireAction("jd.submit")
  submit(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.mutate(req.actor, id, "submit", body, requestId(req));
  }
  @Post("jd-versions/:id/return-to-draft")
  @HttpCode(200)
  @RequireAction("jd.return_to_draft")
  returnToDraft(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.mutate(
      req.actor,
      id,
      "return_to_draft",
      body,
      requestId(req),
    );
  }
  @Post("jd-versions/:id/approve")
  @HttpCode(200)
  @RequireAction("jd.approve")
  approve(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.mutate(req.actor, id, "approve", body, requestId(req));
  }
  @Post("jd-versions/:id/clone") @RequireAction("jd.clone") clone(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.versions.mutate(req.actor, id, "clone", body, requestId(req));
  }
}
