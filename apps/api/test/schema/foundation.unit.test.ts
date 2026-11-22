import { test } from "node:test";
import assert from "node:assert/strict";
import { configSchema } from "../../src/common/config";
import { SafeErrorFilter } from "../../src/common/errors";
import type { ArgumentsHost } from "@nestjs/common";
test("validates deadline ordering and required service token", () => {
  const base = {
    DATABASE_URL: "postgresql://localhost/rms_ai",
    AI_INTERNAL_TOKEN: "test-only-service-token",
  };
  assert.equal(configSchema.parse(base).WORKER_CONCURRENCY, "1");
  assert.equal(
    configSchema.safeParse({ ...base, EXTRACTION_TIMEOUT_MS: 150000 }).success,
    false,
  );
  assert.equal(
    configSchema.safeParse({ ...base, AI_INTERNAL_TOKEN: "" }).success,
    false,
  );
});
test("unexpected errors never disclose implementation details", () => {
  let output: unknown;
  const response = {
    status(n: number) {
      assert.equal(n, 500);
      return this;
    },
    getHeader() {
      return "request-test";
    },
    json(body: unknown) {
      output = body;
    },
  };
  new SafeErrorFilter().catch(new Error("secret connection string"), {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost);
  assert.deepEqual(output, {
    error: {
      code: "internal_error",
      message: "Internal server error",
      request_id: "request-test",
    },
  });
});
