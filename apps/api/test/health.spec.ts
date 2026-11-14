import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './helpers/app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp('health');
});
afterAll(async () => {
  await t.close();
});

describe('health', () => {
  it('GET /api/v1/health trả 200 không cần đăng nhập', async () => {
    const res = await t.http().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
