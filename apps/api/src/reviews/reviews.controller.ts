import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { ReviewsService } from "./reviews.service";
@Controller()
export class ReviewsController {
  constructor(
    @Inject(ReviewsService) private readonly service: ReviewsService,
  ) {}
  @Post("screenings/:id/reviews") @RequireAction("reviews.create") create(
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
  @Get("applications/:id/reviews") @RequireAction("reviews.read") list(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.service.list(req.actor, id, query);
  }
}
