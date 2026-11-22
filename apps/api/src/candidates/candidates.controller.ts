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
import { CandidatesService } from "./candidates.service";
@Controller("candidates")
export class CandidatesController {
  constructor(
    @Inject(CandidatesService) private readonly service: CandidatesService,
  ) {}
  @Get() @RequireAction("candidates.read") list(
    @Req() req: AuthRequest,
    @Query() q: unknown,
  ) {
    return this.service.list(req.actor, q);
  }
  @Get(":id") @RequireAction("candidates.read") get(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.get(req.actor, id);
  }
  @Post() @RequireAction("candidates.create") create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.create(
      req.actor,
      body,
      String(req.res?.getHeader("X-Request-ID")),
    );
  }
  @Patch(":id") @RequireAction("candidates.update") update(
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
