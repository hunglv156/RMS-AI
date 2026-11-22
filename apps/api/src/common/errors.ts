import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
export class PlatformError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number,
  ) {
    super(message, status);
  }
}
@Catch()
export class SafeErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp(),
      res = ctx.getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    res.status(status).json({
      error: {
        code:
          error instanceof PlatformError
            ? error.code
            : status === 500
              ? "internal_error"
              : `http_${status}`,
        message:
          error instanceof HttpException
            ? error.message
            : "Internal server error",
        request_id: res.getHeader("X-Request-ID") || randomUUID(),
      },
    });
  }
}
