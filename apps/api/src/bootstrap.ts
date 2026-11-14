import type { INestApplication } from '@nestjs/common';
import { correlationMiddleware } from './common/correlation.middleware';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.use(correlationMiddleware);
}
