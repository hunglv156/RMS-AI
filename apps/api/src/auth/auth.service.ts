import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, LoginInput, MeDto, MembershipDto, RegisterInput } from '@rms/contracts';
import { sql, type Kysely } from 'kysely';
import { APP_CONFIG, type AppConfig } from '../config';
import { DatabaseService } from '../db/database.service';
import type { Database } from '../db/types';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from './password';

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
const newRefreshToken = (): string => randomBytes(32).toString('base64url');

function slugify(name: string): string {
  const base =
    name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'org';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

@Injectable()
export class AuthService {
  private readonly db: Kysely<Database>;

  constructor(
    @Inject(DatabaseService) database: DatabaseService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.db = database.kysely;
  }

  async register(input: RegisterInput): Promise<AuthTokens> {
    const passwordHash = await hashPassword(input.password);
    const orgId = randomUUID();
    try {
      const userId = await this.db.transaction().execute(async (trx) => {
        const user = await trx
          .insertInto('users')
          .values({ email: input.email, display_name: input.display_name, password_hash: passwordHash })
          .returning('id')
          .executeTakeFirstOrThrow();
        // Org mới tạo trong cùng transaction: set context trước khi ghi vào bảng tenant.
        await sql`SELECT set_config('app.organization_id', ${orgId}, true)`.execute(trx);
        await trx.insertInto('organizations')
          .values({ id: orgId, name: input.organization_name, slug: slugify(input.organization_name), settings_json: '{}' })
          .execute();
        await trx.insertInto('memberships')
          .values({ organization_id: orgId, user_id: user.id, role: 'owner', status: 'active' })
          .execute();
        // Mỗi org có sẵn cấu hình chấm điểm mặc định (rubric_values, min_coverage lấy từ default của bảng).
        await sql`INSERT INTO screening_configs (organization_id) VALUES (${orgId})`.execute(trx);
        await trx.insertInto('audit_events')
          .values({
            organization_id: orgId, actor_id: user.id, action: 'organization.create',
            resource_type: 'organization', resource_id: orgId, metadata_json: '{}',
          })
          .execute();
        return user.id;
      });
      return await this.issue(userId, orgId, randomUUID());
    } catch (e) {
      if ((e as { code?: string }).code === '23505') {
        throw new ConflictException({ code: 'email_taken', message: 'Email đã được đăng ký' });
      }
      throw e;
    }
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.db.selectFrom('users')
      .select(['id', 'password_hash'])
      .where(sql<boolean>`lower(email) = ${input.email}`)
      .executeTakeFirst();
    const ok = await verifyPassword(user?.password_hash ?? (await DUMMY_HASH_PROMISE), input.password);
    if (!user || !ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    const active = (await this.memberships(user.id)).find((m) => m.status === 'active');
    return this.issue(user.id, active?.organization_id ?? null, randomUUID());
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.rotate(refreshToken, null);
  }

  async switchOrg(userId: string, organizationId: string, refreshToken: string): Promise<AuthTokens> {
    const target = (await this.memberships(userId)).find(
      (m) => m.organization_id === organizationId && m.status === 'active',
    );
    if (!target) throw new ForbiddenException('Bạn không thuộc tổ chức này');
    return this.rotate(refreshToken, { userId, organizationId });
  }

  async logout(refreshToken: string): Promise<void> {
    const row = await this.db.selectFrom('refresh_tokens').select('family_id')
      .where('token_hash', '=', sha256(refreshToken)).executeTakeFirst();
    if (row) {
      await this.db.updateTable('refresh_tokens').set({ revoked_at: new Date() })
        .where('family_id', '=', row.family_id).where('revoked_at', 'is', null).execute();
    }
  }

  async me(userId: string, activeOrgId: string | null): Promise<MeDto> {
    const user = await this.db.selectFrom('users').select(['id', 'email', 'display_name'])
      .where('id', '=', userId).executeTakeFirst();
    if (!user) throw new UnauthorizedException();
    const memberships = await this.memberships(userId);
    const active = memberships.find((m) => m.organization_id === activeOrgId && m.status === 'active');
    return {
      user,
      active_organization_id: active?.organization_id ?? null,
      active_role: active?.role ?? null,
      memberships,
    };
  }

  private async memberships(userId: string): Promise<MembershipDto[]> {
    const r = await sql<MembershipDto>`SELECT * FROM auth_memberships(${userId})`.execute(this.db);
    return r.rows;
  }

  private async rotate(
    refreshToken: string,
    switchTo: { userId: string; organizationId: string } | null,
  ): Promise<AuthTokens> {
    const hash = sha256(refreshToken);
    const outcome = await this.db.transaction().execute(async (trx) => {
      const row = await trx.selectFrom('refresh_tokens').selectAll()
        .where('token_hash', '=', hash).forUpdate().executeTakeFirst();
      if (!row) return { kind: 'invalid' as const };
      if (row.used_at || row.revoked_at) {
        // Dùng lại token đã xoay vòng: coi như bị đánh cắp, thu hồi cả họ token.
        await trx.updateTable('refresh_tokens').set({ revoked_at: new Date() })
          .where('family_id', '=', row.family_id).where('revoked_at', 'is', null).execute();
        return { kind: 'reuse' as const };
      }
      if (row.expires_at.getTime() < Date.now()) return { kind: 'invalid' as const };
      if (switchTo && switchTo.userId !== row.user_id) return { kind: 'invalid' as const };
      await trx.updateTable('refresh_tokens').set({ used_at: new Date() }).where('id', '=', row.id).execute();
      return { kind: 'ok' as const, row };
    });
    if (outcome.kind !== 'ok') throw new UnauthorizedException('Refresh token không hợp lệ');
    const { row } = outcome;

    let orgId = switchTo?.organizationId ?? row.active_organization_id;
    const memberships = await this.memberships(row.user_id);
    // Membership có thể đã bị gỡ từ lúc cấp token: kiểm tra lại, không thì chuyển sang org khác.
    if (!memberships.some((m) => m.organization_id === orgId && m.status === 'active')) {
      orgId = memberships.find((m) => m.status === 'active')?.organization_id ?? null;
    }
    return this.issue(row.user_id, orgId, row.family_id);
  }

  private async issue(userId: string, orgId: string | null, familyId: string): Promise<AuthTokens> {
    const access = await this.jwt.signAsync(
      { sub: userId, org_id: orgId, typ: 'access' },
      { expiresIn: this.config.accessTtlSeconds },
    );
    const refresh = newRefreshToken();
    await this.db.insertInto('refresh_tokens').values({
      user_id: userId, family_id: familyId, token_hash: sha256(refresh), active_organization_id: orgId,
      expires_at: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
      used_at: null, revoked_at: null,
    }).execute();
    return {
      access_token: access, refresh_token: refresh,
      expires_in: this.config.accessTtlSeconds, organization_id: orgId ?? '',
    };
  }
}
