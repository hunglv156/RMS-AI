import { config } from "dotenv";
import { resolve } from "node:path";
config({
  path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
});
import { z } from "zod";
export const configSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default("redis://127.0.0.1:56379"),
    AI_BASE_URL: z.string().url().default("http://127.0.0.1:8100"),
    AI_INTERNAL_TOKEN: z.string().min(16),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3100),
    FILE_STORAGE_ROOT: z.string().default(".local-data/cvs"),
    AI_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .max(150000)
      .default(150000),
    EXTRACTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .max(45000)
      .default(45000),
    WORKER_HTTP_TIMEOUT_MS: z.coerce.number().int().default(180000),
    WORKER_LEASE_MS: z.coerce.number().int().default(240000),
    WORKER_CONCURRENCY: z.literal("1").default("1"),
  })
  .superRefine((v, c) => {
    if (
      v.EXTRACTION_TIMEOUT_MS >= v.AI_REQUEST_TIMEOUT_MS ||
      v.WORKER_HTTP_TIMEOUT_MS <= v.AI_REQUEST_TIMEOUT_MS ||
      v.WORKER_LEASE_MS <= v.WORKER_HTTP_TIMEOUT_MS
    )
      c.addIssue({
        code: "custom",
        message: "Deadlines must be extraction < AI < HTTP < lease",
      });
  });
export const loadConfig = () => configSchema.parse(process.env);
