import "reflect-metadata";
import request from "supertest";
import { createApiApp } from "../../src/main";
import { passwordHash } from "../../src/auth/auth.service";
import { fixtureUser } from "../fixtures";
import { testDatabase } from "../auth/setup";
export const draft = {
  title: "Engineer",
  summary: "Build useful tools",
  criteria: [
    {
      code: "python",
      label: "Python",
      description: "Python experience",
      priority: "must_have",
      weight: 1,
      keywords: ["Python"],
    },
  ],
};
export async function setup() {
  const db = await testDatabase();
  const users = [
    fixtureUser("admin"),
    fixtureUser("recruiter"),
    fixtureUser("reviewer"),
    fixtureUser("reviewer"),
  ];
  const password = "Synthetic-password-84";
  const password_hash = await passwordHash(password);
  await db("users").insert(users.map((u) => ({ ...u, password_hash })));
  const app = await createApiApp();
  await app.listen(0, "127.0.0.1");
  const sessions: { cookie: string; csrf: string }[] = [];
  for (const user of users) {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({ email: user.normalized_email, password })
      .expect(200);
    sessions.push({
      cookie: res.headers["set-cookie"][0].split(";")[0],
      csrf: res.body.csrf_token,
    });
  }
  const call = (
    actor: number,
    method: "get" | "post" | "patch" | "put",
    path: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())
      [method]("/api/v1" + path)
      .set("Cookie", sessions[actor].cookie)
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", sessions[actor].csrf);
    return body === undefined ? req : req.send(body);
  };
  return {
    db,
    app,
    users,
    call,
    close: async () => {
      await app.close();
      await db.destroy();
    },
  };
}
