import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, bearer, createTestApp, register, type TestApp } from './helpers/app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp('crud');
});
afterAll(async () => {
  await t.close();
});

const api = '/api/v1';

describe('jobs theo vai trò', () => {
  it('owner/admin/recruiter tạo và sửa job; hiring_manager/viewer chỉ đọc', async () => {
    const owner = await register(t);
    const job = (await t.http().post(`${api}/jobs`).set(bearer(owner)).send({ title: 'Backend Dev' }).expect(201)).body;
    for (const role of ['admin', 'recruiter']) {
      const m = await addMember(t, owner.orgId, role);
      await t.http().post(`${api}/jobs`).set(bearer(m)).send({ title: `by ${role}` }).expect(201);
      await t.http().patch(`${api}/jobs/${job.id}`).set(bearer(m)).send({ status: 'open' }).expect(200);
    }
    for (const role of ['hiring_manager', 'viewer']) {
      const m = await addMember(t, owner.orgId, role);
      await t.http().post(`${api}/jobs`).set(bearer(m)).send({ title: 'x' }).expect(403);
      await t.http().patch(`${api}/jobs/${job.id}`).set(bearer(m)).send({ title: 'x' }).expect(403);
      await t.http().get(`${api}/jobs/${job.id}`).set(bearer(m)).expect(200);
    }
  });

  it('phân trang, tìm kiếm và validation', async () => {
    const o = await register(t);
    for (let i = 0; i < 5; i++) {
      await t.http().post(`${api}/jobs`).set(bearer(o)).send({ title: `Job ${i}` }).expect(201);
    }
    await t.http().post(`${api}/jobs`).set(bearer(o)).send({ title: 'Data %Engineer' }).expect(201);
    const p1 = (await t.http().get(`${api}/jobs?page=1&page_size=4`).set(bearer(o)).expect(200)).body;
    expect(p1).toMatchObject({ page: 1, page_size: 4, total: 6 });
    expect(p1.items).toHaveLength(4);
    const p2 = (await t.http().get(`${api}/jobs?page=2&page_size=4`).set(bearer(o)).expect(200)).body;
    expect(p2.items).toHaveLength(2);
    // Ký tự đặc biệt của LIKE được escape.
    const q = (await t.http().get(`${api}/jobs?q=${encodeURIComponent('%Eng')}`).set(bearer(o)).expect(200)).body;
    expect(q.total).toBe(1);
    const bad = await t.http().post(`${api}/jobs`).set(bearer(o)).send({ title: '' }).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
    await t.http().patch(`${api}/jobs/${p1.items[0].id}`).set(bearer(o)).send({}).expect(400);
    await t.http().get(`${api}/jobs/not-a-uuid`).set(bearer(o)).expect(400);
    await t.http().get(`${api}/jobs?page_size=1000`).set(bearer(o)).expect(400);
  });
});

describe('candidates theo vai trò', () => {
  it('recruiter tạo, chỉ owner/admin xoá', async () => {
    const owner = await register(t);
    const rec = await addMember(t, owner.orgId, 'recruiter');
    const viewer = await addMember(t, owner.orgId, 'viewer');
    const c = (await t.http().post(`${api}/candidates`).set(bearer(rec))
      .send({ display_name: 'Nguyễn Văn A', contact: { email: 'a@example.com' } }).expect(201)).body;
    expect(c.contact.email).toBe('a@example.com');
    await t.http().post(`${api}/candidates`).set(bearer(viewer)).send({ display_name: 'x' }).expect(403);
    await t.http().get(`${api}/candidates/${c.id}`).set(bearer(viewer)).expect(200);
    await t.http().delete(`${api}/candidates/${c.id}`).set(bearer(rec)).expect(403);
    await t.http().delete(`${api}/candidates/${c.id}`).set(bearer(owner)).expect(204);
    await t.http().get(`${api}/candidates/${c.id}`).set(bearer(owner)).expect(404);
    await t.http().delete(`${api}/candidates/${c.id}`).set(bearer(owner)).expect(404);
  });
});

describe('audit', () => {
  it('ghi create/update/delete, không chứa PII, chỉ owner/admin xem', async () => {
    const owner = await register(t);
    const rec = await addMember(t, owner.orgId, 'recruiter');
    const job = (await t.http().post(`${api}/jobs`).set(bearer(owner)).send({ title: 'J' }).expect(201)).body;
    await t.http().patch(`${api}/jobs/${job.id}`).set(bearer(owner)).send({ title: 'J2' }).expect(200);
    const c = (await t.http().post(`${api}/candidates`).set(bearer(owner)).send({ display_name: 'Secret Name', contact: { email: 'secret@x.io' } }).expect(201)).body;
    await t.http().delete(`${api}/candidates/${c.id}`).set(bearer(owner)).expect(204);

    const res = await t.http().get(`${api}/audit-events?page_size=100`).set(bearer(owner)).expect(200);
    const actions = res.body.items.map((e: { action: string }) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['job.create', 'job.update', 'candidate.create', 'candidate.delete', 'organization.create']));
    expect(JSON.stringify(res.body)).not.toMatch(/Secret Name|secret@x\.io/);
    await t.http().get(`${api}/audit-events`).set(bearer(rec)).expect(403);
  });

  it('không có route sửa/xoá audit và DB từ chối UPDATE/DELETE', async () => {
    const owner = await register(t);
    await t.http().delete(`${api}/audit-events`).set(bearer(owner)).expect(404);
    await t.http().patch(`${api}/audit-events/x`).set(bearer(owner)).expect(404);
    await expect(t.db.app.query('DELETE FROM audit_events')).rejects.toThrow();
  });
});

describe('membership', () => {
  it('đổi role ghi audit; admin không đụng được owner; không gỡ owner cuối', async () => {
    const owner = await register(t);
    const admin = await addMember(t, owner.orgId, 'admin');
    const rec = await addMember(t, owner.orgId, 'recruiter');
    const members = (await t.http().get(`${api}/organizations/${owner.orgId}/members`).set(bearer(admin)).expect(200)).body.items;
    const of = (email: string) => members.find((m: { email: string }) => m.email === email);

    const changed = await t.http().patch(`${api}/organizations/${owner.orgId}/members/${of(rec.email).id}`)
      .set(bearer(admin)).send({ role: 'viewer' }).expect(200);
    expect(changed.body.role).toBe('viewer');
    await t.http().post(`${api}/jobs`).set(bearer(rec)).send({ title: 'x' }).expect(403);

    await t.http().patch(`${api}/organizations/${owner.orgId}/members/${of(owner.email).id}`)
      .set(bearer(admin)).send({ role: 'viewer' }).expect(403);
    await t.http().patch(`${api}/organizations/${owner.orgId}/members/${of(rec.email).id}`)
      .set(bearer(admin)).send({ role: 'owner' }).expect(403);
    const last = await t.http().patch(`${api}/organizations/${owner.orgId}/members/${of(owner.email).id}`)
      .set(bearer(owner)).send({ role: 'admin' }).expect(400);
    expect(last.body.error.message).toMatch(/Owner cuối/);

    await t.http().patch(`${api}/organizations/${owner.orgId}/members/${of(rec.email).id}`)
      .set(bearer(rec)).send({ role: 'owner' }).expect(403);
    const audit = (await t.http().get(`${api}/audit-events?page_size=100`).set(bearer(owner)).expect(200)).body.items;
    expect(audit.some((e: { action: string }) => e.action === 'membership.update')).toBe(true);
  });
});
