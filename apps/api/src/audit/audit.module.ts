import { Global, Module } from "@nestjs/common";
import { AUDIT_SERVICE } from "../common/interfaces";
import { AuditWriter } from "./audit-writer.service";
@Global()
@Module({
  providers: [
    AuditWriter,
    { provide: AUDIT_SERVICE, useExisting: AuditWriter },
  ],
  exports: [AuditWriter, AUDIT_SERVICE],
})
export class AuditModule {}
