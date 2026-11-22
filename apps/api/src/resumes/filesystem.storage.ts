import { Injectable } from "@nestjs/common";
import { constants } from "node:fs";
import {
  mkdir,
  lstat,
  realpath,
  open,
  rename,
  unlink,
  readdir,
  chmod,
} from "node:fs/promises";
import { resolve, join, parse } from "node:path";
import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import type { ResumeStorage, StoredResume } from "../common/interfaces";
import { PlatformError } from "../common/errors";
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const keyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.tmp)?$/;
@Injectable()
export class FilesystemResumeStorage implements ResumeStorage {
  private readonly root = resolve(
    process.env.FILE_STORAGE_ROOT ?? ".local-data/cvs",
  );
  private static readonly pendingByRoot = new Map<string, Set<string>>();
  private get pending() {
    let set = FilesystemResumeStorage.pendingByRoot.get(this.root);
    if (!set) {
      set = new Set();
      FilesystemResumeStorage.pendingByRoot.set(this.root, set);
    }
    return set;
  }
  private async directory() {
    if (this.root === parse(this.root).root)
      throw new Error("Private storage requires a dedicated directory");
    // Check every existing ancestor before creating anything; reject symlink roots/parents.
    let current = parse(this.root).root;
    for (const part of this.root
      .slice(current.length)
      .split("/")
      .filter(Boolean)) {
      current = join(current, part);
      try {
        const stat = await lstat(current);
        if (!stat.isDirectory() || stat.isSymbolicLink())
          throw new Error("Unsafe private storage directory");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        await mkdir(current, { mode: 0o700 }).catch(
          (e: NodeJS.ErrnoException) => {
            if (e.code !== "EEXIST") throw e;
          },
        );
        const created = await lstat(current);
        if (!created.isDirectory() || created.isSymbolicLink())
          throw new Error("Unsafe private storage directory");
      }
    }
    if ((await realpath(this.root)) !== this.root)
      throw new Error("Unsafe private storage directory");
    await chmod(this.root, 0o700);
  }
  private path(key: string) {
    if (!keyPattern.test(key))
      throw new PlatformError(
        "invalid_storage_key",
        "Invalid storage key",
        400,
      );
    return join(this.root, key);
  }
  release(key: string) {
    this.pending.delete(key);
  }
  async put(stream: Readable): Promise<StoredResume> {
    await this.directory();
    const key = randomUUID(),
      temp = key + ".tmp";
    this.pending.add(key);
    this.pending.add(temp);
    let file: Awaited<ReturnType<typeof open>> | undefined;
    try {
      file = await open(
        this.path(temp),
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      const hash = createHash("sha256");
      let size = 0,
        signature = Buffer.alloc(0);
      for await (const value of stream) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        size += chunk.length;
        if (size > MAX_PDF_BYTES)
          throw new PlatformError("file_too_large", "PDF exceeds 10 MiB", 413);
        if (signature.length < 5)
          signature = Buffer.concat([signature, chunk]).subarray(0, 5);
        hash.update(chunk);
        await file.writeFile(chunk);
      }
      if (signature.toString("ascii") !== "%PDF-")
        throw new PlatformError("invalid_pdf", "PDF signature required", 400);
      await file.utimes(new Date(), new Date());
      await file.sync();
      await file.close();
      file = undefined;
      await rename(this.path(temp), this.path(key));
      return {
        storageKey: key,
        byteSize: size,
        fileSha256: hash.digest("hex"),
      };
    } catch (error) {
      await file?.close();
      await unlink(this.path(temp)).catch(() => {});
      await unlink(this.path(key)).catch(() => {});
      this.pending.delete(key);
      throw error;
    } finally {
      this.pending.delete(temp);
    }
  }
  async open(key: string): Promise<Readable> {
    await this.directory();
    const file = await open(
      this.path(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      if (!(await file.stat()).isFile())
        throw new Error("Invalid private file");
      return file.createReadStream();
    } catch (e) {
      await file.close();
      throw e;
    }
  }
  async remove(key: string) {
    await this.directory();
    await unlink(this.path(key)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
    this.release(key);
  }
  async reconcile(referenced: ReadonlySet<string>, olderThan: Date) {
    await this.directory();
    const cutoff = Math.min(olderThan.getTime(), Date.now() - 3600000);
    let removed = 0;
    for (const key of await readdir(this.root)) {
      if (!keyPattern.test(key) || referenced.has(key) || this.pending.has(key))
        continue;
      const stat = await lstat(this.path(key));
      if (stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs < cutoff) {
        await unlink(this.path(key));
        removed++;
      }
    }
    return removed;
  }
}
