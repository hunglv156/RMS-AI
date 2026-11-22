import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../db/database";
import { loadConfig } from "../common/config";
import { PlatformError } from "../common/errors";
import { ExecutionError, validManifest } from "./validation";
import type { InputSnapshot } from "@rms-ai/contracts";
@Injectable()
export class AiAdapter {
  private lastAuthenticatedId?: string;
  constructor(@Inject(Database) private readonly db: Database) {}
  async config() {
    const cfg = loadConfig();
    try {
      const response = await fetch(
        new URL("/internal/v1/screening-manifest", cfg.AI_BASE_URL),
        {
          headers: { Authorization: `Bearer ${cfg.AI_INTERNAL_TOKEN}` },
          signal: AbortSignal.timeout(350),
        },
      );
      if (!response.ok) throw new Error("manifest_unavailable");
      const manifest: unknown = await response.json();
      if (!validManifest(manifest)) throw new Error("invalid_manifest");
      await this.db
        .connection("screening_configs")
        .insert({
          fingerprint: manifest.fingerprint,
          effective_manifest_json: manifest,
        })
        .onConflict("fingerprint")
        .ignore();
      this.lastAuthenticatedId = (
        await this.db
          .connection("screening_configs")
          .where({ fingerprint: manifest.fingerprint })
          .first()
      ).id;
      return (await this.db
        .connection("screening_configs")
        .where({ fingerprint: manifest.fingerprint })
        .first())!;
    } catch {
      const query = this.db.connection("screening_configs");
      if (this.lastAuthenticatedId)
        query.where({ id: this.lastAuthenticatedId });
      const cached = await query.orderBy("created_at", "desc").first();
      if (cached && validManifest(cached.effective_manifest_json))
        return cached;
      throw new PlatformError(
        "manifest_unavailable",
        "Screening configuration unavailable",
        503,
      );
    }
  }
  async screen(
    runId: string,
    requestId: string,
    input: InputSnapshot,
    bytes: Buffer,
    signal?: AbortSignal,
  ) {
    const cfg = loadConfig(),
      form = new FormData();
    form.append(
      "cv",
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      "resume.pdf",
    );
    // Python's frozen JD uses the same code field; assessment maps it to criterion_id.
    form.append("jd", JSON.stringify(input.jd));
    const deadline = AbortSignal.timeout(cfg.WORKER_HTTP_TIMEOUT_MS);
    const requestSignal = signal
      ? AbortSignal.any([signal, deadline])
      : deadline;
    let response: Response;
    try {
      response = await fetch(
        new URL("/internal/v1/screenings", cfg.AI_BASE_URL),
        {
          method: "POST",
          body: form,
          headers: {
            Authorization: `Bearer ${cfg.AI_INTERNAL_TOKEN}`,
            "X-Expected-Config-Fingerprint": input.manifest.fingerprint,
            "X-Run-ID": runId,
            "X-Request-ID": requestId,
          },
          signal: requestSignal,
        },
      );
    } catch {
      throw new ExecutionError("transport_timeout", true);
    }
    if (!response.ok) {
      const body: any = await response.json().catch(() => null);
      const code = body?.error?.code;
      const terminal = new Set([
        "invalid_pdf",
        "encrypted_pdf",
        "empty_text",
        "file_too_large",
        "unsupported_type",
        "invalid_jd",
        "config_changed",
        "unauthenticated",
        "llm_schema_error",
      ]);
      if (terminal.has(code)) throw new ExecutionError(code);
      if (response.status === 401 || response.status === 403)
        throw new ExecutionError("ai_auth_failed");
      if (response.status === 429)
        throw new ExecutionError("llm_rate_limited", true);
      if (response.status >= 500)
        throw new ExecutionError("provider_unavailable", true);
      throw new ExecutionError("ai_request_invalid");
    }
    try {
      return await response.json();
    } catch {
      if (requestSignal.aborted)
        throw new ExecutionError("transport_timeout", true);
      throw new ExecutionError("schema_mismatch");
    }
  }
}
