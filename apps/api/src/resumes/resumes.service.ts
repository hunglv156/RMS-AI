import { createHash, randomUUID } from 'node:crypto';
import {
  Inject, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import type { DownloadUrlDto, ResumeDto, ResumeStatusDto } from '@rms/contracts';
import { AuditService } from '../audit/audit.service';
import { S3Service, DOWNLOAD_URL_TTL_SECONDS } from '../storage/s3.service';
import { TenantContext } from '../tenant/tenant-context';
import { FileRejected, validateResumeFile } from './file-validation';

const COLS = [
  'id', 'candidate_id', 'original_filename', 'mime_type', 'size_bytes', 'page_count', 'sha256',
  'parse_status', 'requires_manual_review', 'created_at',
] as const;

type Row = Omit<ResumeDto, 'size_bytes' | 'created_at'> & { size_bytes: string | number; created_at: Date };
const toDto = (r: Row, deduplicated?: boolean): ResumeDto => ({
  ...r, size_bytes: Number(r.size_bytes), created_at: new Date(r.created_at).toISOString(),
  ...(deduplicated === undefined ? {} : { deduplicated }),
});

@Injectable()
export class ResumesService {
  constructor(
    @Inject(TenantContext) private readonly tenant: TenantContext,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  async upload(
    candidateId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<ResumeDto> {
    const { trx, organizationId, userId } = this.tenant.current();

    const candidate = await trx.selectFrom('candidates').select('id')
      .where('organization_id', '=', organizationId).where('id', '=', candidateId).executeTakeFirst();
    if (!candidate) throw new NotFoundException('Không tìm thấy ứng viên');

    let validated;
    try {
      validated = await validateResumeFile(file.buffer, file.originalname, file.mimetype);
    } catch (e) {
      if (e instanceof FileRejected) throw new UnprocessableEntityException({ code: 'file_rejected', message: e.reason });
      throw e;
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await trx.selectFrom('resumes').select([...COLS])
      .where('organization_id', '=', organizationId).where('sha256', '=', sha256).executeTakeFirst();
    if (existing) return toDto(existing as Row, true);

    const id = randomUUID();
    const objectKey = `org/${organizationId}/resumes/${id}`;
    await this.s3.put(objectKey, file.buffer, validated.mime);
    try {
      const inserted = await trx.insertInto('resumes')
        .values({
          id, organization_id: organizationId, candidate_id: candidateId, object_key: objectKey,
          original_filename: file.originalname.slice(0, 255), mime_type: validated.mime,
          size_bytes: file.buffer.length, page_count: validated.pageCount, sha256, created_by: userId,
        })
        .onConflict((oc) => oc.columns(['organization_id', 'sha256']).doNothing())
        .returning([...COLS]).executeTakeFirst();
      if (!inserted) {
        // Upload đồng thời cùng nội dung: bản kia thắng, bỏ object vừa ghi.
        await this.s3.remove(objectKey);
        const winner = await trx.selectFrom('resumes').select([...COLS])
          .where('organization_id', '=', organizationId).where('sha256', '=', sha256).executeTakeFirstOrThrow();
        return toDto(winner as Row, true);
      }
      await this.audit.record('resume.upload', 'resume', id, { candidate_id: candidateId, size: file.buffer.length });
      return toDto(inserted as Row, false);
    } catch (e) {
      await this.s3.remove(objectKey).catch(() => undefined);
      throw e;
    }
  }

  async status(id: string): Promise<ResumeStatusDto> {
    const { trx, organizationId } = this.tenant.current();
    const r = await trx.selectFrom('resumes').select(['id', 'parse_status', 'requires_manual_review'])
      .where('organization_id', '=', organizationId).where('id', '=', id).executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy CV');
    return r;
  }

  async listForCandidate(candidateId: string): Promise<ResumeDto[]> {
    const { trx, organizationId } = this.tenant.current();
    const rows = await trx.selectFrom('resumes').select([...COLS])
      .where('organization_id', '=', organizationId).where('candidate_id', '=', candidateId)
      .orderBy('created_at', 'desc').execute();
    return rows.map((r) => toDto(r as Row));
  }

  /** Chỉ cấp URL sau khi đã qua authorize (quyền + RLS + lọc tổ chức). */
  async downloadUrl(id: string): Promise<DownloadUrlDto> {
    const { trx, organizationId } = this.tenant.current();
    const r = await trx.selectFrom('resumes').select(['object_key', 'original_filename'])
      .where('organization_id', '=', organizationId).where('id', '=', id).executeTakeFirst();
    if (!r) throw new NotFoundException('Không tìm thấy CV');
    await this.audit.record('resume.download', 'resume', id);
    return { url: await this.s3.presignedDownload(r.object_key, r.original_filename), expires_in: DOWNLOAD_URL_TTL_SECONDS };
  }
}
