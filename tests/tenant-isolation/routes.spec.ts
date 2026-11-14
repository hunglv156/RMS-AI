import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember, bearer, createTestApp, register, type Session, type TestApp,
} from '../../apps/api/test/helpers/app';

/**
 * Bộ test âm tính chéo tenant: người dùng org A đụng tới tài nguyên của org B qua MỌI route.
 * Test cuối đếm route thật của ứng dụng; route mới mà chưa khai báo ở đây sẽ làm test đỏ.
 */
const api = '/api/v1';
let t: TestApp;
let a: Session & { email: string };
let b: Session & { email: string };
let jobB: string;
let candB: string;
let memberB: string;

// "METHOD /path/với/:param" đã được kiểm tra trong file này.
const covered = new Set<string>();
const cover = (route: string) => covered.add(route);

beforeAll(async () => {
  t = await createTestApp('isolation');
  a = await register(t, 'A');
  b = await register(t, 'B');
  jobB = (await t.http().post(`${api}/jobs`).set(bearer(b)).send({ title: 'Secret job B' })).body.id;
  candB = (await t.http().post(`${api}/candidates`).set(bearer(b)).send({ display_name: 'Cand B' })).body.id;
  const members = (await t.http().get(`${api}/organizations/${b.orgId}/members`).set(bearer(b))).body.items;
  memberB = members[0].id;
  await t.http().post(`${api}/jobs`).set(bearer(a)).send({ title: 'Job A' });
});
afterAll(async () => {
  await t.close();
});

describe('org A không chạm được tài nguyên của org B', () => {
  it('GET /jobs/:jobId → 404', async () => {
    cover('GET /api/v1/jobs/:jobId');
    await t.http().get(`${api}/jobs/${jobB}`).set(bearer(a)).expect(404);
  });
  it('PATCH /jobs/:jobId → 404 và dữ liệu không đổi', async () => {
    cover('PATCH /api/v1/jobs/:jobId');
    await t.http().patch(`${api}/jobs/${jobB}`).set(bearer(a)).send({ title: 'hacked' }).expect(404);
    const row = await t.db.admin.query('SELECT title FROM jobs WHERE id = $1', [jobB]);
    expect(row.rows[0].title).toBe('Secret job B');
  });
  it('GET /jobs chỉ trả job của org mình', async () => {
    cover('GET /api/v1/jobs');
    const res = await t.http().get(`${api}/jobs?page_size=100`).set(bearer(a)).expect(200);
    expect(res.body.items.map((j: { id: string }) => j.id)).not.toContain(jobB);
    expect(res.body.total).toBe(1);
  });
  it('POST /jobs luôn tạo trong org của người gọi', async () => {
    cover('POST /api/v1/jobs');
    const res = await t.http().post(`${api}/jobs`).set(bearer(a))
      .send({ title: 'x', organization_id: b.orgId }).expect(201);
    const row = await t.db.admin.query('SELECT organization_id FROM jobs WHERE id = $1', [res.body.id]);
    expect(row.rows[0].organization_id).toBe(a.orgId);
  });
  it('GET/DELETE /candidates/:candidateId → 404', async () => {
    cover('GET /api/v1/candidates/:candidateId');
    cover('DELETE /api/v1/candidates/:candidateId');
    await t.http().get(`${api}/candidates/${candB}`).set(bearer(a)).expect(404);
    await t.http().delete(`${api}/candidates/${candB}`).set(bearer(a)).expect(404);
    const row = await t.db.admin.query('SELECT 1 FROM candidates WHERE id = $1', [candB]);
    expect(row.rowCount).toBe(1);
  });
  it('GET/POST /candidates không rò dữ liệu', async () => {
    cover('GET /api/v1/candidates');
    cover('POST /api/v1/candidates');
    const res = await t.http().get(`${api}/candidates`).set(bearer(a)).expect(200);
    expect(res.body.total).toBe(0);
    const c = await t.http().post(`${api}/candidates`).set(bearer(a)).send({ display_name: 'mine' }).expect(201);
    const row = await t.db.admin.query('SELECT organization_id FROM candidates WHERE id = $1', [c.body.id]);
    expect(row.rows[0].organization_id).toBe(a.orgId);
  });
  it('members của org B: URL orgId khác org đang active → 404', async () => {
    cover('GET /api/v1/organizations/:orgId/members');
    cover('PATCH /api/v1/organizations/:orgId/members/:membershipId');
    await t.http().get(`${api}/organizations/${b.orgId}/members`).set(bearer(a)).expect(404);
    await t.http().patch(`${api}/organizations/${b.orgId}/members/${memberB}`).set(bearer(a))
      .send({ role: 'viewer' }).expect(404);
    // Dùng orgId của mình nhưng membershipId của B.
    await t.http().patch(`${api}/organizations/${a.orgId}/members/${memberB}`).set(bearer(a))
      .send({ role: 'viewer' }).expect(404);
    const row = await t.db.admin.query('SELECT role FROM memberships WHERE id = $1', [memberB]);
    expect(row.rows[0].role).toBe('owner');
  });
  it('GET /audit-events không chứa sự kiện của org B', async () => {
    cover('GET /api/v1/audit-events');
    const res = await t.http().get(`${api}/audit-events?page_size=100`).set(bearer(a)).expect(200);
    expect(JSON.stringify(res.body)).not.toContain(jobB);
    expect(JSON.stringify(res.body)).not.toContain(candB);
  });
  it('member của A (mọi vai trò) vẫn không thấy B', async () => {
    for (const role of ['admin', 'recruiter', 'hiring_manager', 'viewer']) {
      const m = await addMember(t, a.orgId, role);
      await t.http().get(`${api}/jobs/${jobB}`).set(bearer(m)).expect(404);
    }
  });
  it('switch-org sang org B khi không phải thành viên → 403', async () => {
    cover('POST /api/v1/auth/switch-org');
    await t.http().post(`${api}/auth/switch-org`).set(bearer(a))
      .send({ organization_id: b.orgId, refresh_token: a.refresh }).expect(403);
  });
});

describe('resumes của org B', () => {
  it('status/download-url/upload vào candidate của B → 404', async () => {
    cover('POST /api/v1/resumes/upload');
    cover('GET /api/v1/resumes/:resumeId/status');
    cover('GET /api/v1/resumes/:resumeId/download-url');
    const { makePdf } = await import('../../apps/api/test/helpers/files');
    const pdf = await makePdf(1, 'iso');
    const up = await t.http().post(`${api}/resumes/upload`).set(bearer(b))
      .field('candidate_id', candB).attach('file', pdf, { filename: 'b.pdf', contentType: 'application/pdf' }).expect(201);
    const rid = up.body.id;
    await t.http().get(`${api}/resumes/${rid}/status`).set(bearer(a)).expect(404);
    await t.http().get(`${api}/resumes/${rid}/download-url`).set(bearer(a)).expect(404);
    await t.http().post(`${api}/resumes/upload`).set(bearer(a))
      .field('candidate_id', candB).attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' }).expect(404);
  });
});

describe('route công khai và route không thuộc tenant', () => {
  it('được ghi nhận là đã xem xét', () => {
    for (const r of [
      'GET /api/v1/health', 'POST /api/v1/auth/register', 'POST /api/v1/auth/login',
      'POST /api/v1/auth/refresh', 'POST /api/v1/auth/logout', 'GET /api/v1/me',
    ]) cover(r);
  });
});

describe('độ phủ route', () => {
  it('mọi route của ứng dụng đều có trong bộ test cách ly', () => {
    const express = t.app.getHttpAdapter().getInstance();
    const stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> =
      express.router?.stack ?? express._router?.stack ?? [];
    const actual = stack.flatMap((l) =>
      l.route ? Object.keys(l.route.methods).map((m) => `${m.toUpperCase()} ${l.route!.path}`) : []);
    expect(actual.length).toBeGreaterThan(0);
    const missing = actual.filter((r) => !covered.has(r));
    expect(missing, `Route chưa có test cách ly tenant: ${missing.join(', ')}`).toEqual([]);
  });
});
