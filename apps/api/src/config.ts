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
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const jwtSecret = overrides.jwtSecret ?? required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET phải dài ít nhất 32 ký tự');
  return {
    databaseUrl: overrides.databaseUrl ?? required('DATABASE_URL'),
    jwtSecret,
    accessTtlSeconds: overrides.accessTtlSeconds ?? 15 * 60,
    refreshTtlSeconds: overrides.refreshTtlSeconds ?? 30 * 24 * 3600,
    s3: overrides.s3 ?? {
      endpoint: required('S3_ENDPOINT'),
      bucket: required('S3_BUCKET'),
      accessKey: required('S3_ACCESS_KEY'),
      secretKey: required('S3_SECRET_KEY'),
    },
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
