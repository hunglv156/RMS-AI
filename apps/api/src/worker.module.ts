import { Module } from "@nestjs/common";
import { QueuesModule } from "./queues/queues.module";
import { ScreeningsModule } from "./screenings/screenings.module";
import { CommonModule } from "./common/common.module";
@Module({
  imports: [CommonModule, QueuesModule, ScreeningsModule],
})
export class WorkerModule {}
