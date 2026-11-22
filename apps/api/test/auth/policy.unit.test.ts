import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JobAuthorization,
  allowedActions,
} from "../../src/auth/authorization.service";
import {
  csrfFor,
  digest,
  parseInput,
  passwordSchema,
} from "../../src/auth/auth.service";
import { browserOrigin, secureCookie } from "../../src/auth/auth.guard";
test("action policy explicitly allows three roles and denies unknown actions", () => {
  const policy = new JobAuthorization(null!);
  for (const role of ["admin", "recruiter", "reviewer"] as const) {
    const actor = { id: "actor", role };
    assert.throws(() => policy.assertAction(actor, "invented"));
    assert.throws(() => policy.assertAction(actor, ""));
    policy.assertAction(actor, "jobs.read");
    assert.equal(
      allowedActions(actor).includes("jd.approve"),
      role !== "recruiter",
    );
    assert.equal(
      allowedActions(actor).includes("users.update"),
      role === "admin",
    );
    assert.equal(
      allowedActions(actor).includes("screenings.create"),
      role !== "reviewer",
    );
    assert.equal(
      allowedActions(actor).includes("candidates.read"),
      role !== "reviewer",
    );
  }
});
test("CSRF is session-bound and password validation never echoes input", () => {
  assert.notEqual(csrfFor("a"), csrfFor("b"));
  assert.match(digest(csrfFor("a")), /^[a-f0-9]{64}$/);
  assert.throws(
    () => parseInput(passwordSchema, "secret"),
    (error) => !String(error).includes("secret"),
  );
});
test("cookie is secure on HTTPS and insecure origins outside localhost fail closed", () => {
  const old = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://demo.example";
    assert.equal(secureCookie(), true);
    process.env.APP_ORIGIN = "http://demo.example";
    assert.throws(browserOrigin);
    process.env.APP_ORIGIN = "http://localhost:5173";
    assert.equal(secureCookie(), false);
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
