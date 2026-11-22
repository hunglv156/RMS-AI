import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadConfig } from "./common/config";
import { SafeErrorFilter } from "./common/errors";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
export async function createApiApp() {
  loadConfig();
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new SafeErrorFilter());
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Request-ID", randomUUID());
    next();
  });
  app.setGlobalPrefix("api/v1", { exclude: ["health/live", "health/ready"] });
  app.enableShutdownHooks();
  return app;
}
export async function bootstrap() {
  const app = await createApiApp();
  await app.listen(loadConfig().API_PORT, "127.0.0.1");
  return app;
}
if (require.main === module) void bootstrap();
