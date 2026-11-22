import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "../../src/worker.module";
import { ScreeningExecution } from "../../src/screenings/execution.service";
void (async () => {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
  });
  const claimed = await app
    .get(ScreeningExecution)
    .claim(process.argv[2], "death-injection");
  process.send?.({ claimed });
  setInterval(() => {}, 1000);
})();
