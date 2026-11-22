import { Module } from "@nestjs/common";
import { RESUME_STORAGE } from "../common/interfaces";
import { FilesystemResumeStorage } from "./filesystem.storage";
import { ResumesController } from "./resumes.controller";
import { ResumesService } from "./resumes.service";
@Module({
  controllers: [ResumesController],
  providers: [
    FilesystemResumeStorage,
    ResumesService,
    { provide: RESUME_STORAGE, useExisting: FilesystemResumeStorage },
  ],
  exports: [FilesystemResumeStorage, ResumesService, RESUME_STORAGE],
})
export class ResumesModule {}
