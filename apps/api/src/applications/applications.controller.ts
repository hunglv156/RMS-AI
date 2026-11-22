import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { ApplicationsService } from "./applications.service";
@Controller()
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService) private readonly service: ApplicationsService,
  ) {}
  @Get("jobs/:id/applications") @RequireAction("applications.read") list(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Query() q: unknown,
  ) {
    return this.service.list(req.actor, id, q);
  }
  @Post("jobs/:id/applications") @RequireAction("applications.create") create(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.create(
      req.actor,
      id,
      body,
      String(req.res?.getHeader("X-Request-ID")),
    );
  }
  @Patch("applications/:id") @RequireAction("applications.update") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      req.actor,
      id,
      body,
      String(req.res?.getHeader("X-Request-ID")),
    );
  }
}
