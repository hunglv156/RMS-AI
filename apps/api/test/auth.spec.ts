import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, createTestApp, register, type TestApp } from './helpers/app';
import { ProbeModule } from './helpers/probe';

const SECRET = 'test-secret-test-secret-test-secret-123';
let t: TestApp;

beforeAll(async () => {
  t = await createTestApp('auth', { imports: [ProbeModule] });
});
afterAll(async () => {
  await t.close();
});

async function userId(email: string): Promise<string> {
  return (await t.db.admin.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
}

/** Thêm user vào org với role mong muốn rồi đăng nhập vào org đó. */
async function memberWithRole(orgId: string, role: string) {
  const u = await register(t, `Home-${role}`);
  await t.db.admin.query(
    'INSERT INTO memberships (organization_id, user_id, role) VALUES ($1,$2,$3)',
    [orgId, await userId(u.email), role],
  );
  const res = await t.http().post('/api/v1/auth/switch-org').set(bearer(u))
    .send({ organization_id: orgId, refresh_token: u.refresh }).expect(200);
  return { ...u, access: res.body.access_token as string, refresh: res.body.refresh_token as string, orgId };
}

describe('đăng ký, đăng nhập, refresh', () => {
  it('register tạo org đầu tiên với vai trò owner, /me phản ánh đúng', async () => {
    const s = await register(t, 'Acme');
    const me = await t.http().get('/api/v1/me').set(bearer(s)).expect(200);
    expect(me.body.active_organization_id).toBe(s.orgId);
    expect(me.body.active_role).toBe('owner');
    expect(me.body.memberships).toHaveLength(1);
  });

  it('email trùng → 409; sai mật khẩu → 401; mật khẩu yếu → 400', async () => {
    const s = await register(t);
    await t.http().post('/api/v1/auth/register').send({
      email: s.email, password: 'correct-horse-battery', display_name: 'X', organization_name: 'Y',
    }).expect(409);
    await t.http().post('/api/v1/auth/login').send({ email: s.email, password: 'wrong-password-1' }).expect(401);
    const weak = await t.http().post('/api/v1/auth/register').send({
      email: 'weak@example.com', password: 'short', display_name: 'X', organization_name: 'Y',
    }).expect(400);
    expect(weak.body.error.code).toBe('validation_error');
    expect(weak.body.error.correlation_id).toBeTruthy();
  });

  it('login thành công, mật khẩu được băm bằng argon2id', async () => {
    const s = await register(t);
    const res = await t.http().post('/api/v1/auth/login')
      .send({ email: s.email, password: 'correct-horse-battery' }).expect(200);
    expect(res.body.access_token).toBeTruthy();
    const h = await t.db.admin.query('SELECT password_hash FROM users WHERE email = $1', [s.email]);
    expect(h.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it('refresh xoay vòng; dùng lại token cũ thì thu hồi cả họ token', async () => {
    const s = await register(t);
    const r1 = await t.http().post('/api/v1/auth/refresh').send({ refresh_token: s.refresh }).expect(200);
    const r2 = await t.http().post('/api/v1/auth/refresh').send({ refresh_token: r1.body.refresh_token }).expect(200);
    // Kẻ tấn công dùng lại token đã xoay vòng.
    await t.http().post('/api/v1/auth/refresh').send({ refresh_token: s.refresh }).expect(401);
    // Token mới nhất của cùng họ cũng bị thu hồi.
    await t.http().post('/api/v1/auth/refresh').send({ refresh_token: r2.body.refresh_token }).expect(401);
  });

  it('logout thu hồi refresh token', async () => {
    const s = await register(t);
    await t.http().post('/api/v1/auth/logout').send({ refresh_token: s.refresh }).expect(204);
    await t.http().post('/api/v1/auth/refresh').send({ refresh_token: s.refresh }).expect(401);
  });
});

describe('tenant guard và RBAC', () => {
  it('thiếu hoặc sai token → 401', async () => {
    await t.http().get('/api/v1/probe/read').expect(401);
    await t.http().get('/api/v1/probe/read').set({ Authorization: 'Bearer garbage' }).expect(401);
  });

  it('sửa claim role/org phía client không có tác dụng (chữ ký sai → 401)', async () => {
    const s = await register(t);
    const forged = await new JwtService({ secret: 'attacker-secret-attacker-secret-xx' }).signAsync(
      { sub: await userId(s.email), org_id: s.orgId, role: 'owner', typ: 'access' }, { expiresIn: 60 });
    await t.http().get('/api/v1/probe/read').set({ Authorization: `Bearer ${forged}` }).expect(401);
  });

  it('role trong token bị bỏ qua: role luôn lấy từ membership', async () => {
    const owner = await register(t);
    const viewer = await memberWithRole(owner.orgId, 'viewer');
    const withFakeRole = await new JwtService({ secret: SECRET }).signAsync(
      { sub: await userId(viewer.email), org_id: owner.orgId, role: 'owner', typ: 'access' }, { expiresIn: 60 });
    const res = await t.http().get('/api/v1/probe/read').set({ Authorization: `Bearer ${withFakeRole}` }).expect(200);
    expect(res.body.role).toBe('viewer');
    await t.http().post('/api/v1/probe/write').set({ Authorization: `Bearer ${withFakeRole}` }).expect(403);
  });

  it('Viewer đọc được, ghi bị 403; Recruiter ghi được', async () => {
    const owner = await register(t);
    const viewer = await memberWithRole(owner.orgId, 'viewer');
    const recruiter = await memberWithRole(owner.orgId, 'recruiter');
    await t.http().get('/api/v1/probe/read').set(bearer(viewer)).expect(200);
    await t.http().post('/api/v1/probe/write').set(bearer(viewer)).expect(403);
    await t.http().post('/api/v1/probe/write').set(bearer(recruiter)).expect(201);
    await t.http().post('/api/v1/probe/write').set(bearer(owner)).expect(201);
  });

  it('user không thuộc org dù token mang org_id đó → 403', async () => {
    const a = await register(t, 'A');
    const b = await register(t, 'B');
    const tokenForB = await new JwtService({ secret: SECRET }).signAsync(
      { sub: await userId(a.email), org_id: b.orgId, typ: 'access' }, { expiresIn: 60 });
    await t.http().get('/api/v1/probe/read').set({ Authorization: `Bearer ${tokenForB}` }).expect(403);
  });

  it('role đổi trong DB có hiệu lực ngay, membership bị khoá thì 403', async () => {
    const owner = await register(t);
    const m = await memberWithRole(owner.orgId, 'recruiter');
    await t.http().post('/api/v1/probe/write').set(bearer(m)).expect(201);
    await t.db.admin.query("UPDATE memberships SET role='viewer' WHERE user_id = $1 AND organization_id = $2", [await userId(m.email), owner.orgId]);
    await t.http().post('/api/v1/probe/write').set(bearer(m)).expect(403);
    await t.db.admin.query("UPDATE memberships SET status='suspended' WHERE user_id = $1 AND organization_id = $2", [await userId(m.email), owner.orgId]);
    await t.http().get('/api/v1/probe/read').set(bearer(m)).expect(403);
  });

  it('route tenant không khai báo quyền bị từ chối mặc định', async () => {
    const s = await register(t);
    await t.http().get('/api/v1/probe/undeclared').set(bearer(s)).expect(403);
  });

  it('lỗi trong handler rollback transaction của request', async () => {
    const s = await register(t);
    await t.http().post('/api/v1/probe/fail-after-write').set(bearer(s)).expect(500);
    const n = await t.db.admin.query("SELECT count(*)::int AS n FROM audit_events WHERE action = 'probe'");
    expect(n.rows[0].n).toBe(0);
  });

  it('switch-org đổi org đang active; org không thuộc → 403', async () => {
    const a = await register(t, 'A');
    const b = await register(t, 'B');
    await t.http().post('/api/v1/auth/switch-org').set(bearer(a))
      .send({ organization_id: b.orgId, refresh_token: a.refresh }).expect(403);
    const owner = await register(t);
    const m = await memberWithRole(owner.orgId, 'admin');
    const me = await t.http().get('/api/v1/me').set(bearer(m)).expect(200);
    expect(me.body.active_organization_id).toBe(owner.orgId);
    expect(me.body.active_role).toBe('admin');
    expect(me.body.memberships).toHaveLength(2);
  });
});
