import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { ScreeningsService } from "./screenings.service";
@Controller()
export class ScreeningsController {
  constructor(
    @Inject(ScreeningsService) private readonly service: ScreeningsService,
  ) {}
  @Get("screening-config") @RequireAction("screening_config.read") config() {
    return this.service.config();
  }
  @Get("screenings/:id") @RequireAction("screenings.read") get(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.get(req.actor, id);
  }
  @Get("applications/:id/screenings") @RequireAction("screenings.read") history(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.service.history(req.actor, id, query);
  }
  @Post("jobs/:id/screenings")
  @HttpCode(202)
  @RequireAction("screenings.create")
  async start(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") key: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.start(
      req.actor,
      id,
      body,
      key,
      String(res.getHeader("X-Request-ID")),
    );
    res.setHeader("Location", `/api/v1/screenings/${result.runs[0].id}`);
    return result;
  }
  @Post("screenings/:id/retries")
  @HttpCode(202)
  @RequireAction("screenings.retry")
  async retry(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") key: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.retry(
      req.actor,
      id,
      key,
      String(res.getHeader("X-Request-ID")),
      body ?? {},
    );
    res.setHeader("Location", `/api/v1/screenings/${result.runs[0].id}`);
    return result;
  }
}
