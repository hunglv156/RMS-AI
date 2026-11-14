import { z } from 'zod';

export const ROLES = ['owner', 'admin', 'recruiter', 'hiring_manager', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PARSE_STATUSES = [
  'uploaded', 'queued', 'validating', 'extracting', 'indexing', 'ready',
  'rejected', 'failed_extraction', 'failed_provider', 'cancelled',
] as const;
export type ParseStatus = (typeof PARSE_STATUSES)[number];

export const healthSchema = z.object({ status: z.literal('ok') });
export type Health = z.infer<typeof healthSchema>;
