import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, connect, type Socket } from "node:net";
import { setup } from "../screenings/support";
import { QueueRuntime } from "../../src/queues/queue-runtime";
async function until(check: () => Promise<boolean>, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("condition timeout");
}
// Redis proxy whose sockets can be turned into black holes: bytes are accepted
// and dropped and the socket is never closed, like an idle-dropping port proxy.
async function blackholeProxy() {
  const target = new URL(process.env.REDIS_URL!);
  const links = new Set<{ client: Socket; upstream: Socket; dead: boolean }>();
  let refuseNew = false;
  const server = createServer((client) => {
    const upstream = connect(Number(target.port || 6379), target.hostname);
    const link = { client, upstream, dead: refuseNew };
    links.add(link);
    client.on("data", (d) => link.dead || upstream.write(d));
    upstream.on("data", (d) => link.dead || client.write(d));
    const end = () => {
      links.delete(link);
      client.destroy();
      upstream.destroy();
    };
    for (const s of [client, upstream]) s.on("close", end).on("error", end);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as any).port;
  return {
    url: `redis://127.0.0.1:${port}`,
    port,
    server,
    dropExisting() {
      for (const link of links) link.dead = true;
    },
    dropNew() {
      refuseNew = true;
    },
    async close() {
      for (const link of links) {
        link.client.destroy();
        link.upstream.destroy();
      }
      if (server.listening)
        await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
test("T8.6b: a silently dropped idle producer socket is replaced on the next tick instead of stalling the outbox", async () => {
  const original = process.env.REDIS_URL!;
  const proxy = await blackholeProxy();
  process.env.REDIS_URL = proxy.url;
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      first = await h.start();
    await runtime.relay(undefined, [first.run.id]);
    // The producer stays "ready" in ioredis but its socket no longer answers.
    proxy.dropExisting();
    const a = await h.fresh(),
      second = await h.start(randomUUID(), {
        ...h.body,
        application_ids: [a.id],
      });
    const started = Date.now();
    await runtime.relay(undefined, [second.run.id]);
    const event = await h
      .db("outbox_events")
      .where({ run_id: second.run.id })
      .first();
    assert.notEqual(event.delivered_at, null, "outbox stalled on dead socket");
    assert.equal(event.attempts, 1);
    assert(Date.now() - started < 2000);
    assert(await runtime.queue.getJob(`${second.run.id}-1`));
  } finally {
    await h.app.get(QueueRuntime).queue.obliterate({ force: true });
    await h.close();
    await proxy.close();
    process.env.REDIS_URL = original;
  }
});
test("T8.6b: a failed enqueue is logged as degraded with the waiting outbox, never swallowed", async () => {
  const original = process.env.REDIS_URL!;
  const proxy = await blackholeProxy();
  process.env.REDIS_URL = proxy.url;
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      warnings: string[] = [];
    (runtime as any).logger.warn = (m: string) => warnings.push(m);
    const first = await h.start();
    await runtime.relay(undefined, [first.run.id]);
    proxy.dropExisting();
    proxy.dropNew();
    const a = await h.fresh(),
      second = await h.start(randomUUID(), {
        ...h.body,
        application_ids: [a.id],
      });
    await runtime.tick();
    const event = await h
      .db("outbox_events")
      .where({ run_id: second.run.id })
      .first();
    assert.equal(event.delivered_at, null);
    assert.equal(warnings.length, 1);
    assert.match(
      warnings[0],
      /Screening dispatch unavailable; durable work retained; \d+ outbox event\(s\) waiting, oldest \d+ s/,
    );
  } finally {
    await h.close();
    await proxy.close();
    process.env.REDIS_URL = original;
  }
});
test("T8.6b: a worker started before Redis is reachable consumes as soon as Redis comes up", async () => {
  const original = process.env.REDIS_URL!;
  const proxy = await blackholeProxy();
  await new Promise<void>((r) => proxy.server.close(() => r()));
  process.env.REDIS_URL = proxy.url;
  const h = await setup();
  try {
    const runtime = h.app.get(QueueRuntime),
      { run } = await h.start();
    runtime.startWorker();
    // Long enough for BullMQ's first connection attempt to fail.
    await new Promise((r) => setTimeout(r, 1500));
    proxy.server.listen(proxy.port, "127.0.0.1");
    await once(proxy.server, "listening");
    await until(async () => {
      await runtime.relay(undefined, [run.id]).catch(() => {});
      return Boolean(
        (await h.db("outbox_events").where({ run_id: run.id }).first())
          .delivered_at,
      );
    });
    await until(
      async () =>
        (await h.db("screening_runs").where({ id: run.id }).first()).status ===
        "completed",
    );
  } finally {
    await h.app.get(QueueRuntime).queue.obliterate({ force: true });
    await h.close();
    await proxy.close();
    process.env.REDIS_URL = original;
  }
});
