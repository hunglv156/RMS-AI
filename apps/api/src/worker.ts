import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { loadConfig } from "./common/config";
export async function bootstrapWorker() {
  loadConfig();
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  return app;
}
if (require.main === module) void bootstrapWorker();
