import { Injectable } from "@nestjs/common";
import type { AuditEvent, AuditService } from "../common/interfaces";
import type { Transaction } from "../db/database";
/** Free text is allowed only for the bounded JD return reason. */
const allowed = new Set([
  "role",
  "previous_role",
  "disabled",
  "reason_code",
  "changed_fields",
]);
@Injectable()
export class AuditWriter implements AuditService {
  async append(tx: Transaction, event: AuditEvent): Promise<void> {
    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.safe_metadata_json)) {
      if (key === "return_reason") {
        if (
          event.action !== "jd.returned_to_draft" ||
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > 2000
        )
          throw new Error("Invalid JD return reason");
        metadata[key] = value.trim();
        continue;
      }
      if (!allowed.has(key)) throw new Error("Unsafe audit metadata key");
      if (key === "changed_fields") {
        if (
          !Array.isArray(value) ||
          !value.every((v) =>
            ["role", "disabled", "password", "display_name"].includes(v),
          )
        )
          throw new Error("Unsafe audit fields");
      } else if (key === "disabled") {
        if (typeof value !== "boolean") throw new Error("Invalid audit flag");
      } else if (typeof value !== "string" || !/^[a-z_]{1,64}$/.test(value))
        throw new Error("Unsafe audit value");
      metadata[key] = value;
    }
    await tx("audit_events").insert({ ...event, safe_metadata_json: metadata });
  }
}
