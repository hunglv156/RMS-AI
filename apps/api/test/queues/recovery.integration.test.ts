import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { createServer, connect, type Socket } from "node:net";
import { setup, envelope } from "../screenings/support";
import { Database } from "../../src/db/database";
import { QueueRuntime } from "../../src/queues/queue-runtime";
import { ScreeningExecution } from "../../src/screenings/execution.service";
import { ExecutionError } from "../../src/screenings/validation";
async function until(check: () => Promise<boolean>) {
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("condition timeout");
}
test("outbox crash after enqueue redelivers one job, survives producer reconnect, and rebuilds namespaced Redis loss", async () => {
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      { run } = await h.start();
    const ids = [run.id];
    await assert.rejects(
      runtime.relay(async () => {
        throw new Error("crash after enqueue");
      }, ids),
    );
    let events = await h.db("outbox_events").where({ run_id: run.id });
    assert.equal(events.length, 1);
    assert.equal(events[0].delivered_at, null);
    assert(await runtime.queue.getJob(`${run.id}-1`));
    await Promise.all([
      runtime.relay(undefined, ids),
      runtime.relay(undefined, ids),
    ]);
    assert.equal((await runtime.queue.getJobCounts()).waiting, 1);
    events = await h.db("outbox_events").where({ run_id: run.id });
    assert(events[0].delivered_at);
    // Lose only this test's queue; no FLUSHDB and no shared service restart.
    await runtime.queue.obliterate({ force: true });
    await runtime.reconcile(ids);
    events = await h
      .db("outbox_events")
      .where({ run_id: run.id })
      .orderBy("delivery_generation");
    assert.equal(events.length, 2);
    await runtime.relay(undefined, ids);
    assert(await runtime.queue.getJob(`${run.id}-2`));
    runtime.startWorker();
    await until(
      async () =>
        (await h.db("screening_runs").where({ id: run.id }).first()).status ===
        "completed",
    );
    assert.equal(h.calls, 1);
    await runtime.reconcile(ids);
    await runtime.relay(undefined, ids);
    assert.equal(
      (await h.db("screening_runs").where({ id: run.id }).first()).status,
      "completed",
    );
    assert.equal(
      (
        await h
          .db("screening_criterion_results")
          .where({ screening_run_id: run.id })
      ).length,
      1,
    );
  } finally {
    await h.app.get(QueueRuntime).queue.obliterate({ force: true });
    await h.close();
  }
});
test("killed worker lease recovery fences old token and persists exhausted failures", async () => {
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      execution = h.app.get(ScreeningExecution),
      { run } = await h.start();
    await runtime.relay(undefined, [run.id]);
    const child = fork(resolve("test/queues/worker-child.ts"), [run.id], {
      execArgv: ["--import", "tsx"],
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    const message: any = await Promise.race([
      once(child, "message").then(([m]) => m),
      once(child, "exit").then(() => {
        throw new Error("claim child exited");
      }),
    ]);
    const old = message.claimed;
    assert.equal(old.attempt_count, 1);
    child.kill("SIGKILL");
    await once(child, "exit");
    await h
      .db("screening_runs")
      .where({ id: run.id })
      .update({ lease_expires_at: new Date(0) });
    await runtime.reconcile([run.id]);
    assert.equal(
      await execution.finish(old, envelope(run.input_snapshot_json), "late"),
      false,
    );
    await runtime.relay(undefined, [run.id]);
    const second = await execution.claim(run.id, "recovered");
    assert.equal(second.attempt_count, 2);
    assert.notEqual(second.attempt_token, old.attempt_token);
    assert.equal(
      await execution.fail(
        old,
        new ExecutionError("transport_timeout", true),
        "late",
      ),
      false,
    );
    await h
      .db("screening_runs")
      .where({ id: run.id })
      .update({ lease_expires_at: new Date(0) });
    await runtime.reconcile([run.id]);
    const failed = await h.db("screening_runs").where({ id: run.id }).first();
    assert.equal(failed.status, "failed");
    assert.equal(failed.error_code, "attempts_exhausted");
    assert.equal(await execution.claim(run.id, "third"), null);
    assert.equal(h.calls, 0);
  } finally {
    await h.app.get(QueueRuntime).queue.obliterate({ force: true });
    await h.close();
  }
});
test("automatic retry is redelivered durably and terminal BullMQ failures are retained", async () => {
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      { run } = await h.start();
    h.fault(429, "llm_rate_limited");
    await runtime.relay(undefined, [run.id]);
    runtime.startWorker();
    await until(
      async () =>
        (await h.db("screening_runs").where({ id: run.id }).first()).status ===
        "retry_wait",
    );
    await until(
      async () =>
        (await (await runtime.queue.getJob(`${run.id}-1`))!.getState()) ===
        "failed",
    );
    await runtime.reconcile([run.id]);
    assert.equal(
      (await h.db("outbox_events").where({ run_id: run.id })).length,
      1,
    );
    await h
      .db("screening_runs")
      .where({ id: run.id })
      .update({ next_retry_at: new Date(0) });
    await runtime.reconcile([run.id]);
    await runtime.relay(undefined, [run.id]);
    await until(
      async () =>
        (await h.db("screening_runs").where({ id: run.id }).first()).status ===
        "failed",
    );
    await until(
      async () =>
        (await (await runtime.queue.getJob(`${run.id}-2`))!.getState()) ===
        "failed",
    );
    assert.equal(h.calls, 2);
    assert.equal(await runtime.queue.getFailedCount(), 2);
  } finally {
    await h.app.get(QueueRuntime).queue.obliterate({ force: true });
    await h.close();
  }
});
test("Redis connection restart preserves delivery; unavailable Redis still admits durable degraded 202", async () => {
  const original = process.env.REDIS_URL!;
  const target = new URL(original);
  const sockets = new Set<Socket>();
  const proxy = createServer((client) => {
    const upstream = connect(Number(target.port || 6379), target.hostname);
    sockets.add(client);
    sockets.add(upstream);
    client.pipe(upstream);
    upstream.pipe(client);
    client.on("error", () => {});
    upstream.on("error", () => client.destroy());
    client.on("close", () => {
      upstream.destroy();
      sockets.delete(client);
      sockets.delete(upstream);
    });
  });
  proxy.listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const port = (proxy.address() as any).port;
  process.env.REDIS_URL = `redis://127.0.0.1:${port}`;
  const h = await setup();
  let cold: QueueRuntime | undefined;
  try {
    const runtime = h.app.get(QueueRuntime),
      { run } = await h.start();
    await runtime.relay(undefined, [run.id]);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((r) => proxy.close(() => r()));
    const a = await h.fresh(),
      queued = await h.start(randomUUID(), {
        ...h.body,
        application_ids: [a.id],
      });
    assert.equal(queued.response.body.dispatch_state, "degraded");
    assert.equal(queued.run.status, "queued");
    assert.equal(
      (await h.db("outbox_events").where({ run_id: queued.run.id }).first())
        .delivered_at,
      null,
    );
    cold = new QueueRuntime(h.app.get(Database), h.app.get(ScreeningExecution));
    await assert.rejects(cold.relay(undefined, [queued.run.id]));
    runtime.startWorker();
    proxy.listen(port, "127.0.0.1");
    await once(proxy, "listening");
    await cold.relay(undefined, [run.id, queued.run.id]);
    assert(await cold.queue.getJob(`${run.id}-1`));
    assert(await cold.queue.getJob(`${queued.run.id}-1`));
    await until(
      async () =>
        (await h.db("screening_runs").where({ id: run.id }).first()).status ===
          "completed" &&
        (await h.db("screening_runs").where({ id: queued.run.id }).first())
          .status === "completed",
    );
  } finally {
    await h.close();
    if (cold) {
      await cold.queue.obliterate({ force: true });
      await cold.onModuleDestroy();
    }
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((r) => proxy.close(() => r()));
    process.env.REDIS_URL = original;
  }
});
