import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@rms/contracts';

export const IS_PUBLIC = 'rms:public';
export const NO_TENANT = 'rms:no-tenant';
export const REQUIRED_PERMISSION = 'rms:permission';

/** Route không cần đăng nhập. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route cần đăng nhập nhưng không chạy trong context tenant (vd /me). */
export const NoTenant = () => SetMetadata(NO_TENANT, true);
/** Route tenant: bắt buộc khai báo action; thiếu khai báo thì bị từ chối (deny by default). */
export const RequirePermission = (p: Permission) => SetMetadata(REQUIRED_PERMISSION, p);

export interface AuthPrincipal {
  userId: string;
  organizationId: string | null;
}
