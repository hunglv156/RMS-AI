import {
  Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';
import {
  createCandidateSchema, listQuerySchema, type CreateCandidateInput, type ListQuery,
} from '@rms/contracts';
import { RequirePermission } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { ResumesService } from '../resumes/resumes.service';
import { CandidatesService } from './candidates.service';

@Controller('candidates')
export class CandidatesController {
  constructor(
    @Inject(CandidatesService) private readonly candidates: CandidatesService,
    @Inject(ResumesService) private readonly resumes: ResumesService,
  ) {}

  @Get() @RequirePermission('candidate:read')
  list(@Query(new ZodPipe(listQuerySchema)) q: ListQuery) {
    return this.candidates.list(q);
  }

  @Post() @RequirePermission('candidate:write')
  create(@Body(new ZodPipe(createCandidateSchema)) body: CreateCandidateInput) {
    return this.candidates.create(body);
  }

  @Get(':candidateId') @RequirePermission('candidate:read')
  get(@Param('candidateId', ParseUUIDPipe) id: string) {
    return this.candidates.get(id);
  }

  @Get(':candidateId/resumes') @RequirePermission('resume:read')
  async resumesOf(@Param('candidateId', ParseUUIDPipe) id: string) {
    await this.candidates.get(id); // 404 nếu không thuộc tổ chức
    return { items: await this.resumes.listForCandidate(id) };
  }

  @Delete(':candidateId') @HttpCode(204) @RequirePermission('candidate:delete')
  async remove(@Param('candidateId', ParseUUIDPipe) id: string) {
    await this.candidates.remove(id);
  }
}
