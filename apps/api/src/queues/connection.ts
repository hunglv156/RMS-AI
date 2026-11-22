import Redis from "ioredis";
import { loadConfig } from "../common/config";
export const queuePrefix = () =>
  process.env.TEST_REDIS_PREFIX
    ? `${process.env.TEST_REDIS_PREFIX}_screenings`
    : "rms_screenings";
export function redisConnection(worker = false) {
  const r = new Redis(loadConfig().REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 300,
    commandTimeout: worker ? undefined : 500,
    maxRetriesPerRequest: worker ? null : 0,
    retryStrategy: worker ? () => 1000 : () => null,
  });
  r.on("error", () => {});
  return r;
}
export async function dispatchState(): Promise<"pending" | "degraded"> {
  const r = redisConnection();
  try {
    await r.connect();
    await r.ping();
    return "pending";
  } catch {
    return "degraded";
  } finally {
    r.disconnect();
  }
}
