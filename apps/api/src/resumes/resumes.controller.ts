import {
  BadRequestException, Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { MAX_FILE_BYTES } from './file-validation';
import { ResumesService } from './resumes.service';

const uploadBody = z.object({ candidate_id: z.string().uuid() });

@Controller('resumes')
export class ResumesController {
  constructor(@Inject(ResumesService) private readonly resumes: ResumesService) {}

  @Post('upload') @RequirePermission('resume:upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES + 1, files: 1 } }))
  async upload(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body(new ZodPipe(uploadBody)) body: z.infer<typeof uploadBody>,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) throw new BadRequestException({ code: 'file_required', message: 'Thiếu file' });
    const dto = await this.resumes.upload(body.candidate_id, file);
    res.status(dto.deduplicated ? 200 : 201);
    return dto;
  }

  @Get(':resumeId/status') @RequirePermission('resume:read')
  status(@Param('resumeId', ParseUUIDPipe) id: string) {
    return this.resumes.status(id);
  }

  @Get(':resumeId/profile') @RequirePermission('resume:read')
  profile(@Param('resumeId', ParseUUIDPipe) id: string) {
    return this.resumes.profile(id);
  }

  @Get(':resumeId/download-url') @RequirePermission('resume:download')
  downloadUrl(@Param('resumeId', ParseUUIDPipe) id: string) {
    return this.resumes.downloadUrl(id);
  }
}
