import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Readable } from "node:stream";
import {
  mkdtemp,
  readdir,
  readFile,
  symlink,
  utimes,
  writeFile,
  lstat,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import request from "supertest";
import { setup, pdf } from "../candidates/support";
import {
  FilesystemResumeStorage,
  MAX_PDF_BYTES,
} from "../../src/resumes/filesystem.storage";
import { ResumesService } from "../../src/resumes/resumes.service";
import { Database } from "../../src/db/database";
import { AuditWriter } from "../../src/audit/audit-writer.service";
import { JobAuthorization } from "../../src/auth/authorization.service";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.close();
});
const files = () => readdir(process.env.FILE_STORAGE_ROOT!);
test("streamed private PDF versions hash exact bytes, sanitize names, omit storage and authorize download", async () => {
  const c = await ctx.candidate();
  const row = await ctx.upload(c.id);
  assert.equal(row.version_no, 1);
  assert.equal(row.byte_size, pdf.length);
  assert.equal(row.file_sha256, createHash("sha256").update(pdf).digest("hex"));
  assert.equal(row.storage_key, undefined);
  const boundary = Buffer.alloc(MAX_PDF_BYTES, 65);
  pdf.copy(boundary);
  const maxRow = await ctx.upload(c.id, boundary);
  assert.equal(maxRow.byte_size, MAX_PDF_BYTES);
  const rows = await Promise.all([ctx.upload(c.id), ctx.upload(c.id)]);
  assert.deepEqual(rows.map((r) => r.version_no).sort(), [3, 4]);
  const stored = await ctx.db("resumes").where({ id: row.id }).first();
  assert.equal(
    (await lstat(join(process.env.FILE_STORAGE_ROOT!, stored.storage_key)))
      .mode & 0o777,
    0o600,
  );
  const res = await ctx.http("get", `/resumes/${row.id}/content`).expect(200);
  assert.deepEqual(res.body, pdf);
  assert.equal(res.headers["cache-control"], "private, no-store");
  assert.match(res.headers["content-disposition"], /^attachment;/);
  await request(ctx.app.getHttpServer())
    .get(`/api/v1/resumes/${row.id}/content`)
    .expect(401);
  await ctx.http("get", `/resumes/${randomUUID()}/content`).expect(404);
  await ctx.http("get", `/resumes/${row.id}/content`, 2).expect(404);
  await ctx
    .http("post", `/candidates/${c.id}/resumes`, 2)
    .attach("cv", pdf, { filename: "demo.pdf", contentType: "application/pdf" })
    .expect(403);
  assert.ok(
    await ctx
      .db("audit_events")
      .where({ resource_id: row.id, action: "resume.download_authorized" })
      .first(),
  );
  const hostile = await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", pdf, {
      filename: 'bad"\r\nheader.pdf',
      contentType: "application/pdf",
    })
    .expect(201);
  assert.doesNotMatch(hostile.body.original_filename, /["\r\n]/);
});
test("type, signature, size, missing candidate, multipart errors and DB failure clean every new file", async () => {
  const c = await ctx.candidate();
  const initial = (await files()).sort();
  await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", pdf, { filename: "bad.pdf", contentType: "text/plain" })
    .expect(400);
  await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", Buffer.from("not pdf"), {
      filename: "bad.pdf",
      contentType: "application/pdf",
    })
    .expect(400);
  await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", Buffer.alloc(0), {
      filename: "bad.pdf",
      contentType: "application/pdf",
    })
    .expect(400);
  const huge = Buffer.alloc(MAX_PDF_BYTES + 1, 65);
  pdf.copy(huge);
  await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", huge, {
      filename: "huge.pdf",
      contentType: "application/pdf",
    })
    .expect(413);
  await ctx
    .http("post", `/candidates/${randomUUID()}/resumes`)
    .attach("cv", pdf, { filename: "demo.pdf", contentType: "application/pdf" })
    .expect(404);
  await ctx
    .http("post", `/candidates/${c.id}/resumes`)
    .attach("cv", pdf, { filename: "demo.pdf", contentType: "application/pdf" })
    .field("extra", "denied")
    .expect(400);
  const storage = ctx.app.get(FilesystemResumeStorage);
  const staged = await storage.put(Readable.from(pdf));
  const service = new ResumesService(
    ctx.app.get(Database),
    {
      append: async () => {
        throw new Error("injected audit failure");
      },
    } as unknown as AuditWriter,
    ctx.app.get(JobAuthorization),
    storage,
  );
  await assert.rejects(
    service.create(ctx.users[1], c.id, staged, "demo.pdf", "test"),
  );
  assert.equal(
    await ctx.db("resumes").where({ candidate_id: c.id }).first(),
    undefined,
  );
  assert.deepEqual((await files()).sort(), initial);
});
test("adapter blocks traversal, symlinks, oversized streams and cleans interrupted writes; reconciliation preserves references, recent files and symlinks", async () => {
  const storage = ctx.app.get(FilesystemResumeStorage),
    root = process.env.FILE_STORAGE_ROOT!;
  for (const key of ["../escape", "/etc/passwd", "", randomUUID() + "/x"]) {
    await assert.rejects(storage.open(key));
    await assert.rejects(storage.remove(key));
  }
  const target = join(root, "outside.txt");
  await writeFile(target, "outside");
  const link = randomUUID();
  await symlink(target, join(root, link));
  await assert.rejects(storage.open(link));
  const before = (await files()).sort();
  const broken = Readable.from(
    (async function* () {
      yield pdf;
      throw new Error("interrupted");
    })(),
  );
  await assert.rejects(storage.put(broken));
  await assert.rejects(
    storage.put(Readable.from([pdf, Buffer.alloc(MAX_PDF_BYTES)])),
  );
  assert.deepEqual((await files()).sort(), before);
  const referenced = await storage.put(Readable.from(pdf)),
    orphan = await storage.put(Readable.from(pdf)),
    recent = await storage.put(Readable.from(pdf));
  for (const file of [referenced, orphan, recent])
    storage.release(file.storageKey);
  const old = new Date(Date.now() - 7200000),
    temp = randomUUID() + ".tmp";
  await writeFile(join(root, temp), "partial");
  for (const key of [referenced.storageKey, orphan.storageKey, temp])
    await utimes(join(root, key), old, old);
  assert.equal(
    await storage.reconcile(new Set([referenced.storageKey]), new Date()),
    2,
  );
  assert.deepEqual(await readFile(join(root, referenced.storageKey)), pdf);
  assert.deepEqual(await readFile(join(root, recent.storageKey)), pdf);
  assert.equal((await lstat(join(root, link))).isSymbolicLink(), true);
  const nested = await mkdtemp(join(root, "symlink-check-"));
  const symlinkRoot = join(nested, "link");
  await symlink(root, symlinkRoot);
  process.env.FILE_STORAGE_ROOT = symlinkRoot;
  try {
    const bad = new FilesystemResumeStorage();
    await assert.rejects(bad.put(Readable.from(pdf)));
    await assert.rejects(bad.open(referenced.storageKey));
  } finally {
    process.env.FILE_STORAGE_ROOT = root;
    await rm(nested, { recursive: true, force: true });
  }
});
