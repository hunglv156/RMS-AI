import { Module } from "@nestjs/common";
import { ScreeningsModule } from "../screenings/screenings.module";
import { QueueRuntime } from "./queue-runtime";
@Module({
  imports: [ScreeningsModule],
  providers: [QueueRuntime],
  exports: [QueueRuntime],
})
export class QueuesModule {}
