import type { Readable } from "node:stream";
import type { Role } from "@rms-ai/contracts";
import type { Transaction } from "../db/database";
export interface Actor {
  id: string;
  role: Role;
}
export interface AuthorizationPolicy {
  assertAction(actor: Actor, action: string): void;
  assertJobAccess(actor: Actor, jobId: string, tx?: Transaction): Promise<void>;
}
export const AUTHORIZATION_POLICY = Symbol("AuthorizationPolicy");
export interface AuditEvent {
  actor_id: string | null;
  actor_type: "user" | "worker" | "system";
  action: string;
  resource_type: string;
  resource_id: string;
  job_id?: string;
  request_id: string;
  safe_metadata_json: Record<string, unknown>;
}
export interface AuditService {
  append(tx: Transaction, event: AuditEvent): Promise<void>;
}
export const AUDIT_SERVICE = Symbol("AuditService");
export interface StoredResume {
  storageKey: string;
  byteSize: number;
  fileSha256: string;
}
export interface ResumeStorage {
  put(stream: Readable): Promise<StoredResume>;
  open(storageKey: string): Promise<Readable>;
  remove(storageKey: string): Promise<void>;
  reconcile(
    referencedKeys: ReadonlySet<string>,
    olderThan: Date,
  ): Promise<number>;
}
export const RESUME_STORAGE = Symbol("ResumeStorage");
