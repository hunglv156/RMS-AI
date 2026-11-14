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
  'application:write',
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
    'resume:upload', 'resume:download', 'screening:run', 'application:write',
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

// ===== Job / Candidate / Member =====
export const JOB_STATUSES = ['draft', 'open', 'closed'] as const;
export const createJobSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).default(''),
});
export const updateJobSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(20000),
    status: z.enum(JOB_STATUSES),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Cần ít nhất một trường để cập nhật');
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export interface JobDto {
  id: string;
  title: string;
  description: string;
  status: (typeof JOB_STATUSES)[number];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const CONSENT_STATUSES = ['unknown', 'granted', 'withdrawn'] as const;
export const createCandidateSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  contact: z
    .object({
      email: z.string().trim().email().max(254).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .default({}),
  consent_status: z.enum(CONSENT_STATUSES).default('unknown'),
});
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

export interface CandidateDto {
  id: string;
  display_name: string;
  contact: { email?: string; phone?: string };
  consent_status: (typeof CONSENT_STATUSES)[number];
  created_at: string;
}

export const listQuerySchema = pageQuerySchema.extend({ q: z.string().trim().max(100).optional() });
export type ListQuery = z.infer<typeof listQuerySchema>;

export const updateMemberSchema = z
  .object({ role: z.enum(ROLES), status: z.enum(['active', 'suspended']) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Cần ít nhất một trường để cập nhật');
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export interface MemberDto {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: Role;
  status: 'active' | 'suspended';
}

export interface AuditEventDto {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: unknown;
  created_at: string;
}

// ===== Resume =====
export interface ResumeDto {
  id: string;
  candidate_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  page_count: number | null;
  sha256: string;
  parse_status: ParseStatus;
  requires_manual_review: boolean;
  created_at: string;
  deduplicated?: boolean;
}
export interface ResumeStatusDto {
  id: string;
  parse_status: ParseStatus;
  requires_manual_review: boolean;
}
export interface DownloadUrlDto {
  url: string;
  expires_in: number;
}

// ===== Hồ sơ đã trích xuất =====
export interface ExtractedProfile {
  headline: string | null;
  years_of_experience: number | null;
  skills: string[];
  experience: { company: string | null; title: string | null; period: string | null }[];
  education: string[];
  languages: string[];
}
export interface ResumeProfileDto {
  resume_id: string;
  parse_status: ParseStatus;
  requires_manual_review: boolean;
  quality_flags: string[];
  profile: ExtractedProfile | null;
  model: string | null;
  prompt_version: string | null;
  error: string | null;
}

// ===== JD version, tiêu chí, application =====
export const CRITERION_TYPES = [
  'technical_skill', 'experience', 'soft_skill', 'language', 'education', 'other',
] as const;
export const CRITERION_PRIORITIES = ['must_have', 'nice_to_have'] as const;

export const criterionInputSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]{1,48}$/, 'code: chữ thường, số, gạch dưới, bắt đầu bằng chữ'),
  label: z.string().trim().min(1).max(200),
  type: z.enum(CRITERION_TYPES).default('technical_skill'),
  priority: z.enum(CRITERION_PRIORITIES).default('nice_to_have'),
  // Trọng số phải hữu hạn và không âm (README 11.1); tổng phải dương được kiểm tra riêng.
  weight: z.number().finite().min(0).max(1000),
  description: z.string().max(2000).default(''),
  evidence_guidance: z.array(z.string().max(300)).max(10).default([]),
});
export type CriterionInput = z.infer<typeof criterionInputSchema>;

export const putCriteriaSchema = z
  .object({ criteria: z.array(criterionInputSchema).min(1).max(30) })
  .superRefine((v, ctx) => {
    const codes = new Set<string>();
    for (const [i, c] of v.criteria.entries()) {
      if (codes.has(c.code)) {
        ctx.addIssue({ code: 'custom', path: ['criteria', i, 'code'], message: `Trùng mã tiêu chí: ${c.code}` });
      }
      codes.add(c.code);
    }
    if (!(v.criteria.reduce((a, c) => a + c.weight, 0) > 0)) {
      ctx.addIssue({ code: 'custom', path: ['criteria'], message: 'Tổng trọng số phải lớn hơn 0' });
    }
  });
export type PutCriteriaInput = z.infer<typeof putCriteriaSchema>;

export const createJdVersionSchema = z.object({
  content: z.record(z.unknown()).default({}),
});
export type CreateJdVersionInput = z.infer<typeof createJdVersionSchema>;

export interface CriterionDto extends CriterionInput {
  id: string;
  sort_order: number;
}
export interface JdVersionDto {
  id: string;
  job_id: string;
  version_no: number;
  approval_status: 'draft' | 'approved';
  approved_at: string | null;
  content: Record<string, unknown>;
  created_at: string;
  criteria: CriterionDto[];
}

export const createApplicationSchema = z.object({
  candidate_id: z.string().uuid(),
  resume_id: z.string().uuid(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export interface ApplicationDto {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name: string;
  resume_id: string;
  resume_status: ParseStatus;
  stage: string;
  created_at: string;
}
