import "reflect-metadata";
import { realpath } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { testDatabase } from "../auth/setup";
import { fixtureUser, fixtureJob } from "../fixtures";
import { createApiApp } from "../../src/main";
import { AuthService, passwordHash } from "../../src/auth/auth.service";
export const pdf = Buffer.from("%PDF-1.4\nSynthetic demo CV\n%%EOF\n");
export async function setup() {
  process.env.FILE_STORAGE_ROOT = await realpath(
    process.env.FILE_STORAGE_ROOT!,
  );
  const db = await testDatabase();
  const users = [
    fixtureUser("admin"),
    fixtureUser("recruiter"),
    fixtureUser("reviewer"),
    fixtureUser("reviewer"),
  ];
  const password = "Synthetic-candidate-test-82";
  const password_hash = await passwordHash(password);
  await db("users").insert(users.map((u) => ({ ...u, password_hash })));
  const jobs = [fixtureJob(users[0].id), fixtureJob(users[0].id)];
  await db("jobs").insert(jobs);
  await db("job_assignments").insert({
    job_id: jobs[0].id,
    user_id: users[2].id,
    assigned_by: users[0].id,
  });
  const app = await createApiApp();
  await app.listen(0, "127.0.0.1");
  const sessions = await Promise.all(
    users.map((u, i) =>
      app
        .get(AuthService)
        .login(
          { email: u.normalized_email, password },
          `t85-${randomUUID()}-${i}`,
          "test",
        ),
    ),
  );
  const http = (method: "get" | "post" | "patch", path: string, actor = 1) =>
    request(app.getHttpServer())
      [method]("/api/v1" + path)
      .set("Cookie", `rms_session=${sessions[actor].token}`)
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", sessions[actor].session.csrf_token);
  const candidate = async (name = "Synthetic Candidate") =>
    (
      await http("post", "/candidates")
        .send({ display_name: name, provenance: "synthetic" })
        .expect(201)
    ).body;
  const upload = async (id: string, bytes = pdf) =>
    (
      await http("post", `/candidates/${id}/resumes`)
        .attach("cv", bytes, {
          filename: "demo.pdf",
          contentType: "application/pdf",
        })
        .expect(201)
    ).body;
  return {
    db,
    app,
    users,
    jobs,
    http,
    candidate,
    upload,
    close: async () => {
      await app.close();
      await db.destroy();
    },
  };
}
