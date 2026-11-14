import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function correlationMiddleware(
  req: Request & { correlationId?: string },
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header('x-request-id');
  req.correlationId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.correlationId);
  next();
}
