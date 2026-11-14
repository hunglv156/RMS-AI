import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
}

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  s3: { endpoint: string; bucket: string; accessKey: string; secretKey: string };
  redisUrl: string;
  ai: { url: string; hmacSecret: string; timeoutMs: number };
  pipeline: {
    /** Tắt thì không chạy poller và worker (test không cần Redis/AI). */
    enabled: boolean;
    parseConcurrency: number;
    extractConcurrency: number;
    screenConcurrency: number;
    attempts: number;
    backoffMs: number;
    lockDurationMs: number;
    pollIntervalMs: number;
    queuePrefix: string;
  };
}

export type ConfigOverrides = Partial<Omit<AppConfig, 'pipeline'>> & {
  pipeline?: Partial<AppConfig['pipeline']>;
};

export function loadConfig(overrides: ConfigOverrides = {}): AppConfig {
  const jwtSecret = overrides.jwtSecret ?? required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET phải dài ít nhất 32 ký tự');
  const pipeline = {
    enabled: true,
    parseConcurrency: 2,
    // LLM chỉ chạy một lượt tại một thời điểm (ADR 0002).
    extractConcurrency: 1,
    screenConcurrency: 1,
    attempts: 3,
    backoffMs: 5000,
    // Phải dài hơn timeout gọi AI (180s) để BullMQ không coi job đang chạy là stalled.
    lockDurationMs: 300_000,
    pollIntervalMs: 500,
    queuePrefix: 'rms',
    ...overrides.pipeline,
  };
  return {
    databaseUrl: overrides.databaseUrl ?? required('DATABASE_URL'),
    jwtSecret,
    accessTtlSeconds: overrides.accessTtlSeconds ?? 15 * 60,
    refreshTtlSeconds: overrides.refreshTtlSeconds ?? 30 * 24 * 3600,
    redisUrl: overrides.redisUrl ?? required('REDIS_URL'),
    ai: overrides.ai ?? {
      url: required('AI_SERVICE_URL'),
      hmacSecret: required('AI_HMAC_SECRET'),
      timeoutMs: 180_000,
    },
    pipeline,
    s3: overrides.s3 ?? {
      endpoint: required('S3_ENDPOINT'),
      bucket: required('S3_BUCKET'),
      accessKey: required('S3_ACCESS_KEY'),
      secretKey: required('S3_SECRET_KEY'),
    },
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
