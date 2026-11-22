import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { AuditReaderController } from "../audit/audit-reader.controller";
import { AuditReaderService } from "../audit/audit-reader.service";
// Keep the read-only reporting routes together without changing the audit writer module.
@Module({
  controllers: [DashboardController, AuditReaderController],
  providers: [DashboardService, AuditReaderService],
})
export class DashboardModule {}
