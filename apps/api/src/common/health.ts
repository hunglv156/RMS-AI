import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import Redis from "ioredis";
import { Database } from "../db/database";
import { loadConfig } from "./config";
@Controller("health")
export class HealthController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.connection.raw("select 1");
    } catch {
      throw new ServiceUnavailableException("database_unavailable");
    }
    const cfg = loadConfig();
    const redis = new Redis(cfg.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 500,
      commandTimeout: 500,
      retryStrategy: () => null,
      maxRetriesPerRequest: 0,
    });
    redis.on("error", () => {});
    const [redisState, ai] = await Promise.all([
      redis
        .connect()
        .then(() => redis.ping())
        .then(() => "ok")
        .catch(() => "degraded")
        .finally(() => redis.disconnect()),
      fetch(new URL("/health", cfg.AI_BASE_URL), {
        signal: AbortSignal.timeout(500),
      })
        .then((r) => (r.ok ? "ok" : "degraded"))
        .catch(() => "degraded"),
    ]);
    return {
      status: "ready",
      database: "ok",
      redis: redisState,
      ai,
      worker: { status: "unknown", last_seen_at: null },
    };
  }
}
