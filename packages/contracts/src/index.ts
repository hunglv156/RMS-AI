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

// ===== RBAC (README 4.3): kiểm tra theo action, mặc định từ chối =====
export const PERMISSIONS = [
  'workspace:manage',
  'membership:write',
  'job:read',
  'job:write',
  'jd:write',
  'jd:approve',
  'candidate:read',
  'candidate:write',
  'candidate:delete',
  'resume:read',
  'resume:upload',
  'resume:download',
  'screening:read',
  'screening:run',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const READ: Permission[] = ['job:read', 'candidate:read', 'resume:read', 'screening:read'];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => p !== 'workspace:manage'),
  recruiter: [
    ...READ, 'job:write', 'jd:write', 'candidate:write',
    'resume:upload', 'resume:download', 'screening:run',
  ],
  hiring_manager: [...READ, 'jd:approve', 'resume:download'],
  viewer: READ,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ===== Auth =====
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).max(200);

export const registerSchema = z.object({
  email,
  password,
  display_name: z.string().trim().min(1).max(100),
  organization_name: z.string().trim().min(1).max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refresh_token: z.string().min(20).max(200) });
export const switchOrgSchema = z.object({
  organization_id: z.string().uuid(),
  refresh_token: z.string().min(20).max(200),
});

export interface MembershipDto {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: Role;
  status: 'active' | 'suspended';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  organization_id: string;
}

export interface MeDto {
  user: { id: string; email: string; display_name: string };
  active_organization_id: string | null;
  active_role: Role | null;
  memberships: MembershipDto[];
}

// ===== Lỗi và phân trang chuẩn =====
export interface ApiError {
  error: { code: string; message: string; details?: unknown; correlation_id: string };
}

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});
export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
