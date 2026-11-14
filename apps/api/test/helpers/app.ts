import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { createTestDb, type TestDb } from './db';

export interface TestApp {
  app: INestApplication;
  db: TestDb;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

export async function createTestApp(
  tag: string,
  opts: { overrides?: object; imports?: unknown[] } = {},
): Promise<TestApp> {
  const db = await createTestDb(tag);
  const mod = await Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        databaseUrl: db.appUrl,
        jwtSecret: 'test-secret-test-secret-test-secret-123',
        ...opts.overrides,
      }),
      ...((opts.imports ?? []) as never[]),
    ],
  }).compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    db,
    http: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await db.drop();
    },
  };
}

export interface Session {
  access: string;
  refresh: string;
  orgId: string;
  userId?: string;
}

let counter = 0;
export async function register(t: TestApp, name = 'Org'): Promise<Session & { email: string }> {
  const email = `user${++counter}-${Date.now()}@example.com`;
  const res = await t.http().post('/api/v1/auth/register').send({
    email, password: 'correct-horse-battery', display_name: 'User', organization_name: name,
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { access: res.body.access_token, refresh: res.body.refresh_token, orgId: res.body.organization_id, email };
}

export const bearer = (s: { access: string }) => ({ Authorization: `Bearer ${s.access}` });
