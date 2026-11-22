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
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { UsersService } from "./users.service";
@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get()
  @RequireAction("users.read")
  list(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.users.list(req.actor, query);
  }
  @Post()
  @RequireAction("users.create")
  create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.users.create(
      req.actor,
      body,
      String(res.getHeader("X-Request-ID")),
    );
  }
  @Patch(":id")
  @RequireAction("users.update")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.users.update(
      req.actor,
      id,
      body,
      String(res.getHeader("X-Request-ID")),
    );
  }
}
