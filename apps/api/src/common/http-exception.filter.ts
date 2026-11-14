import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { ApiError } from '@rms/contracts';
import type { Request, Response } from 'express';

const CODES: Record<number, string> = {
  400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found',
  409: 'conflict', 413: 'payload_too_large', 415: 'unsupported_media_type', 422: 'unprocessable',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request & { correlationId?: string }>();
    const correlation_id = req.correlationId ?? 'unknown';

    let status = 500;
    let code = 'internal_error';
    let message = 'Lỗi hệ thống';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODES[status] ?? 'error';
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (typeof b.code === 'string') code = b.code;
        if (typeof b.message === 'string') message = b.message;
        else if (Array.isArray(b.message)) message = b.message.join('; ');
        details = b.details;
      }
    } else {
      this.log.error(`[${correlation_id}] ${(exception as Error)?.stack ?? String(exception)}`);
    }
    const payload: ApiError = { error: { code, message, details, correlation_id } };
    res.status(status).json(payload);
  }
}
