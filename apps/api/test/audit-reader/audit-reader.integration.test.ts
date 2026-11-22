import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { setup } from "../candidates/support";
import { randomUUID } from "node:crypto";

test("audit reader is admin-only and filters/paginates with stable ordering and contract-safe metadata", async () => {
  const h = await setup();
  try {
    await request(h.app.getHttpServer())
      .get("/api/v1/audit-events")
      .expect(401);
    for (const actor of [1, 2, 3])
      await h.http("get", "/audit-events", actor).expect(403);
    const resource = randomUUID(),
      time = "2026-06-15T10:00:00.000Z";
    const rows = await h
      .db("audit_events")
      .insert(
        [
          {
            action: "review.created",
            resource_type: "human_review",
            job_id: h.jobs[0].id,
          },
          {
            action: "review.created",
            resource_type: "human_review",
            job_id: h.jobs[0].id,
          },
          {
            action: "screening.completed",
            resource_type: "screening",
            job_id: h.jobs[1].id,
          },
        ].map((r) => ({
          ...r,
          actor_id: h.users[0].id,
          actor_type: "user",
          resource_id: resource,
          request_id: randomUUID(),
          safe_metadata_json: { reason_code: "verified" },
          created_at: time,
        })),
      )
      .returning("*");
    const query = `/audit-events?resource_id=${resource}&sort=created_at&pageSize=1`;
    const page1 = (await h.http("get", query, 0).expect(200)).body;
    const page2 = (await h.http("get", query + "&page=2", 0).expect(200)).body;
    assert.equal(page1.total, 3);
    assert.equal(page1.page, 1);
    assert.equal(page1.pageSize, 1);
    assert.equal(page1.items[0].id, String(rows[0].id));
    assert.equal(page2.items[0].id, String(rows[1].id));
    assert.equal(page1.items[0].actor_id, h.users[0].id);
    assert.equal(page1.items[0].created_at, time);
    assert.deepEqual(page1.items[0].safe_metadata, { reason_code: "verified" });
    assert(!Object.hasOwn(page1.items[0], "safe_metadata_json"));
    const desc = (
      await h
        .http(
          "get",
          `/audit-events?resource_id=${resource}&sort=-created_at`,
          0,
        )
        .expect(200)
    ).body;
    assert.deepEqual(
      desc.items.map((r: any) => r.id),
      rows.map((r) => String(r.id)).reverse(),
    );
    const filters = `&action=review.created&resource_type=human_review&job_id=${h.jobs[0].id}&from=${time}&to=${time}`;
    assert.equal(
      (
        await h
          .http("get", `/audit-events?resource_id=${resource}${filters}`, 0)
          .expect(200)
      ).body.total,
      2,
    );
    for (const q of [
      "action=missing",
      "resource_type=missing",
      `job_id=${h.jobs[1].id}&action=review.created`,
      "from=2026-06-16T00:00:00Z",
      "to=2026-06-14T00:00:00Z",
    ])
      assert.equal(
        (
          await h
            .http("get", `/audit-events?resource_id=${resource}&${q}`, 0)
            .expect(200)
        ).body.total,
        0,
      );
    assert.equal(
      (
        await h
          .http("get", `/audit-events?resource_id=${resource}&page=10`, 0)
          .expect(200)
      ).body.items.length,
      0,
    );
    for (const q of [
      "page=0",
      "pageSize=101",
      "job_id=invalid",
      "from=invalid",
      "from=2026-06-16T00:00:00Z&to=2026-06-14T00:00:00Z",
      "sort=unsafe",
    ])
      await h.http("get", `/audit-events?${q}`, 0).expect(400);
    await assert.rejects(
      h
        .db("audit_events")
        .where({ id: rows[0].id })
        .update({ action: "tamper" }),
    );
    await assert.rejects(
      h.db("audit_events").where({ id: rows[0].id }).delete(),
    );
  } finally {
    await h.close();
  }
});
