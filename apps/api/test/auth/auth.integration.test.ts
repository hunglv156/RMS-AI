import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { createApiApp } from "../../src/main";
import { Database } from "../../src/db/database";
import { JobAuthorization } from "../../src/auth/authorization.service";
import { UsersService } from "../../src/users/users.service";
import { AuthService, digest, passwordHash } from "../../src/auth/auth.service";
import {
  fixtureUser,
  fixtureJob,
  fixtureCandidate,
  fixtureResume,
} from "../fixtures";
import { testDatabase } from "./setup";
let db: Knex, app: Awaited<ReturnType<typeof createApiApp>>;
const password = "Synthetic-password-82";
const users = [
  fixtureUser("admin"),
  fixtureUser("recruiter"),
  fixtureUser("reviewer"),
];
const origin = "http://localhost:5173";
before(async () => {
  db = await testDatabase();
  const password_hash = await passwordHash(password);
  await db("users").insert(users.map((u) => ({ ...u, password_hash })));
  app = await createApiApp();
  await app.listen(0, "127.0.0.1");
});
after(async () => {
  await app?.close();
  await db?.destroy();
});
const server = () => app.getHttpServer();
async function login(index = 0, cookie?: string) {
  const req = request(server())
    .post("/api/v1/auth/login")
    .set("Origin", origin);
  if (cookie) req.set("Cookie", cookie);
  const res = await req
    .send({ email: users[index].normalized_email.toUpperCase(), password })
    .expect(200);
  return {
    cookie: res.headers["set-cookie"][0].split(";")[0] as string,
    body: res.body,
    res,
  };
}
test("all roles log in with safe cookies, hash-only storage, rotation, me and logout", async () => {
  for (let i = 0; i < 3; i++) {
    const first = await login(i);
    assert.equal(first.body.user.role, users[i].role);
    const event = await db("audit_events")
      .where({
        request_id: first.res.headers["x-request-id"],
        action: "auth.login",
      })
      .first();
    assert.equal(event.actor_id, users[i].id);
    assert.deepEqual(event.safe_metadata_json, {});
    assert.equal(first.body.user.password_hash, undefined);
    assert.match(first.res.headers["set-cookie"][0], /HttpOnly/);
    assert.match(first.res.headers["set-cookie"][0], /SameSite=Lax/);
    assert.match(first.res.headers["set-cookie"][0], /Path=\//);
    const token = first.cookie.split("=")[1];
    const row = await db("sessions")
      .where({ token_hash: digest(token) })
      .first();
    assert.ok(row);
    assert.notEqual(row.csrf_token_hash, first.body.csrf_token);
    assert.ok(new Date(row.expires_at).getTime() - Date.now() <= 8 * 3600000);
    const me = await request(server())
      .get("/api/v1/auth/me")
      .set("Cookie", first.cookie)
      .expect(200);
    assert.equal(me.body.csrf_token, first.body.csrf_token);
    const second = await login(i, first.cookie);
    assert.notEqual(second.cookie, first.cookie);
    await request(server())
      .get("/api/v1/auth/me")
      .set("Cookie", first.cookie)
      .expect(401);
    await request(server())
      .post("/api/v1/auth/logout")
      .set("Origin", origin)
      .set("Cookie", second.cookie)
      .set("X-CSRF-Token", second.body.csrf_token)
      .expect(204);
    await request(server())
      .get("/api/v1/auth/me")
      .set("Cookie", second.cookie)
      .expect(401);
  }
});
test("origin, CSRF, expiry, invalid credentials and login throttle fail safely", async () => {
  await request(server()).post("/api/v1/auth/login").send({}).expect(403);
  await request(server())
    .post("/api/v1/auth/login")
    .set("Origin", "https://evil.example")
    .send({})
    .expect(403);
  const session = await login();
  await request(server())
    .post("/api/v1/auth/logout")
    .set("Origin", origin)
    .set("Cookie", session.cookie)
    .expect(403);
  await request(server())
    .post("/api/v1/auth/logout")
    .set("Origin", origin)
    .set("Cookie", session.cookie)
    .set("X-CSRF-Token", "wrong")
    .expect(403);
  await request(server())
    .post("/api/v1/auth/logout")
    .set("Cookie", session.cookie)
    .set("X-CSRF-Token", session.body.csrf_token)
    .expect(403);
  await db("sessions")
    .where({ token_hash: digest(session.cookie.split("=")[1]) })
    .update({ expires_at: new Date(0) });
  await request(server())
    .get("/api/v1/auth/me")
    .set("Cookie", session.cookie)
    .expect(401);
  // A separate source key avoids coupling this service-level rate test to HTTP suite order.
  const auth = app.get(AuthService);
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      auth.login(
        { email: "absent@example.test", password: "wrong" },
        "throttle-fixture",
        "test",
      ),
      (e: any) => e.code === "invalid_credentials",
    );
  await assert.rejects(
    auth.login(
      { email: "absent@example.test", password: "wrong" },
      "throttle-fixture",
      "test",
    ),
    (e: any) => e.code === "login_throttled",
  );
});
test("user routes restrict management, validate passwords and immediately recheck role/disable", async () => {
  // Reset only in-memory limiter between independent scenarios.
  const admin = await app
    .get(AuthService)
    .login(
      { email: users[0].normalized_email, password },
      "admin-fixture",
      "test",
    );
  const cookie = `rms_session=${admin.token}`;
  const recruiter = await login(1);
  await request(server()).get("/api/v1/users").expect(401);
  await request(server()).post("/api/v1/users").send({}).expect(401);
  await request(server())
    .get("/api/v1/users")
    .set("Cookie", recruiter.cookie)
    .expect(403);
  await request(server())
    .get("/api/v1/users?pageSize=101")
    .set("Cookie", cookie)
    .expect(400);
  const mutation = () =>
    request(server())
      .post("/api/v1/users")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .set("X-CSRF-Token", admin.session.csrf_token);
  await mutation()
    .send({
      email: "new@example.test",
      display_name: "New",
      role: "reviewer",
      password: "short",
    })
    .expect(400);
  const email = `${randomUUID()}@example.test`;
  const created = await mutation()
    .send({ email, display_name: "Synthetic", role: "reviewer", password })
    .expect(201);
  assert.equal(created.body.password_hash, undefined);
  await mutation()
    .send({ email, display_name: "Synthetic", role: "reviewer", password })
    .expect(409);
  const patch = (id: string, body: object) =>
    request(server())
      .patch(`/api/v1/users/${id}`)
      .set("Origin", origin)
      .set("Cookie", cookie)
      .set("X-CSRF-Token", admin.session.csrf_token)
      .send(body);
  await patch(users[1].id, { role: "reviewer" }).expect(200);
  const me = await request(server())
    .get("/api/v1/auth/me")
    .set("Cookie", recruiter.cookie)
    .expect((res) => assert.equal(res.status, 200, JSON.stringify(res.body)));
  assert.equal(me.body.user.role, "reviewer");
  await patch(users[1].id, { disabled: true }).expect(200);
  await request(server())
    .get("/api/v1/auth/me")
    .set("Cookie", recruiter.cookie)
    .expect(401);
  await assert.rejects(
    app
      .get(AuthService)
      .login(
        { email: users[1].normalized_email, password },
        "disabled-fixture",
        "test",
      ),
  );
  await patch(users[1].id, { disabled: false, role: "recruiter" }).expect(200);
  const fresh = await app
    .get(AuthService)
    .login({ email, password }, "reset-fixture", "test");
  await patch(created.body.id, {
    password: "Changed-synthetic-password",
  }).expect(200);
  await assert.rejects(app.get(AuthService).authenticate(fresh.token));
});
test("last active admin survives simultaneous demotions and disabling", async () => {
  // Use an isolated transaction for the single-admin guard, independent of existing fixture accounts.
  const tx = await db.transaction();
  try {
    await tx("users")
      .where({ role: "admin" })
      .update({ disabled_at: new Date() });
    await tx("users").where({ id: users[0].id }).update({ disabled_at: null });
    const service = new UsersService(
      { transaction: (f: any) => f(tx) } as Database,
      app.get<any>(require("../../src/audit/audit-writer.service").AuditWriter),
      app.get(JobAuthorization),
    );
    for (const body of [{ role: "reviewer" }, { disabled: true }])
      await assert.rejects(
        service.update(users[0], users[0].id, body, "test"),
        (e: any) => e.code === "last_admin",
      );
  } finally {
    await tx.rollback();
  }
  const service = app.get(UsersService);
  const activeAdmins = await db("users")
    .where({ role: "admin" })
    .whereNull("disabled_at")
    .select("id");
  const secondAdmin = fixtureUser("admin");
  await db("users").insert(secondAdmin);
  try {
    await db("users")
      .where({ role: "admin" })
      .whereNotIn("id", [users[0].id, secondAdmin.id])
      .update({ disabled_at: new Date() });
    const outcomes = await Promise.allSettled([
      service.update(users[0], users[0].id, { role: "reviewer" }, "test"),
      service.update(secondAdmin, secondAdmin.id, { disabled: true }, "test"),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(
      outcomes.filter(
        (o) => o.status === "rejected" && o.reason.code === "last_admin",
      ).length,
      1,
    );
    assert.equal(
      (await db("users").where({ role: "admin" }).whereNull("disabled_at"))
        .length,
      1,
    );
  } finally {
    await db("users")
      .whereIn(
        "id",
        activeAdmins.map((u) => u.id),
      )
      .update({ role: "admin", disabled_at: null });
    await db("users")
      .where({ id: secondAdmin.id })
      .update({ disabled_at: new Date() });
  }
});
test("job/resource authorization checks arbitrary IDs and linked versus unlinked resumes", async () => {
  const tx = await db.transaction();
  try {
    const policy = app.get(JobAuthorization),
      job = fixtureJob(users[0].id),
      other = fixtureJob(users[0].id);
    await tx("jobs").insert([job, other]);
    await tx("job_assignments").insert({
      job_id: job.id,
      user_id: users[2].id,
      assigned_by: users[0].id,
    });
    for (const id of ["not-a-uuid", randomUUID(), other.id])
      await assert.rejects(
        policy.assertJobAccess(users[2], id, tx),
        (e: any) => e.code === "not_found",
      );
    await policy.assertJobAccess(users[2], job.id, tx);
    await policy.assertJobAccess(users[1], other.id, tx);
    const candidate = fixtureCandidate(users[0].id);
    await tx("candidates").insert(candidate);
    const linked = fixtureResume(candidate.id, users[0].id),
      hidden = { ...fixtureResume(candidate.id, users[0].id), version_no: 2 };
    await tx("resumes").insert([linked, hidden]);
    const application = {
      id: randomUUID(),
      job_id: job.id,
      candidate_id: candidate.id,
      resume_id: linked.id,
      created_by: users[0].id,
    };
    await tx("applications").insert(application);
    await policy.assertResourceAccess(
      users[2],
      "application",
      application.id,
      tx,
    );
    await policy.assertResourceAccess(users[2], "resume", linked.id, tx);
    const jd = {
      id: randomUUID(),
      job_id: job.id,
      version_no: 1,
      title: "Synthetic JD",
      summary: "Synthetic",
      created_by: users[0].id,
    };
    await tx("jd_versions").insert(jd);
    await tx("job_criteria").insert({
      jd_version_id: jd.id,
      code: "synthetic",
      label: "Synthetic",
      description: "Synthetic",
      priority: "must_have",
      weight: 1,
      keywords_json: "[]",
      sort_order: 0,
    });
    await tx("jd_versions")
      .where({ id: jd.id })
      .update({ state: "pending_approval" });
    await tx("jd_versions")
      .where({ id: jd.id })
      .update({
        state: "approved",
        approved_by: users[0].id,
        approved_at: new Date(),
        content_sha256: digest("synthetic"),
      });
    const config = {
      id: randomUUID(),
      fingerprint: digest(randomUUID()),
      effective_manifest_json: {},
    };
    await tx("screening_configs").insert(config);
    const run = {
      id: randomUUID(),
      application_id: application.id,
      job_id: job.id,
      resume_id: linked.id,
      jd_version_id: jd.id,
      scoring_config_id: config.id,
      input_snapshot_json: {},
      input_fingerprint: digest(randomUUID()),
      requested_by: users[0].id,
    };
    await tx("screening_runs").insert(run);
    await policy.assertResourceAccess(users[2], "jd", jd.id, tx);
    await policy.assertResourceAccess(users[2], "screening", run.id, tx);
    // Application replacement must not remove access to the previously screened version.
    await tx("applications")
      .where({ id: application.id })
      .update({ resume_id: hidden.id });
    await policy.assertResourceAccess(users[2], "resume", linked.id, tx);
    await tx("applications")
      .where({ id: application.id })
      .update({ resume_id: linked.id });
    await assert.rejects(
      policy.assertResourceAccess(users[2], "resume", hidden.id, tx),
    );
    await tx("job_assignments").where({ job_id: job.id }).delete();
    await assert.rejects(
      policy.assertResourceAccess(users[2], "application", application.id, tx),
    );
    await assert.rejects(
      policy.assertResourceAccess(users[2], "resume", linked.id, tx),
    );
  } finally {
    await tx.rollback();
  }
});
