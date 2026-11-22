import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response, Request } from "express";
import type { AuthRequest } from "../auth/auth.guard";
import { RequireAction } from "../auth/authorization.service";
import { FilesystemResumeStorage, MAX_PDF_BYTES } from "./filesystem.storage";
import { ResumesService } from "./resumes.service";
import { PlatformError } from "../common/errors";
import type { StoredResume } from "../common/interfaces";
// Multer streams directly into the storage adapter, never buffering a full CV in RAM.
class PrivateUploadEngine {
  private get storage() {
    return new FilesystemResumeStorage();
  }
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error: unknown, info?: any) => void,
  ) {
    if (file.mimetype !== "application/pdf")
      return callback(
        new PlatformError(
          "invalid_pdf",
          "Content type must be application/pdf",
          400,
        ),
      );
    const abort = () => file.stream.destroy(new Error("Upload interrupted"));
    req.once("aborted", abort);
    this.storage
      .put(file.stream)
      .then((info) => callback(null, { ...info, size: info.byteSize }))
      .catch(callback)
      .finally(() => req.removeListener("aborted", abort));
  }
  _removeFile(
    _req: Request,
    file: Express.Multer.File & Partial<StoredResume>,
    callback: (error: Error | null) => void,
  ) {
    if (!file.storageKey) return callback(null);
    this.storage
      .remove(file.storageKey)
      .then(() => callback(null))
      .catch(callback);
  }
}
@Controller()
export class ResumesController {
  constructor(
    @Inject(ResumesService) private readonly service: ResumesService,
  ) {}
  @Post("candidates/:id/resumes")
  @RequireAction("resumes.create")
  @UseInterceptors(
    FileInterceptor("cv", {
      storage: new PrivateUploadEngine(),
      limits: { fileSize: MAX_PDF_BYTES + 1, files: 1, fields: 0, parts: 2 },
    }),
  )
  upload(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File & StoredResume,
  ) {
    if (!file) throw new PlatformError("invalid_pdf", "PDF file required", 400);
    const filename =
      file.originalname
        .replace(/[^a-zA-Z0-9._ -]/g, "_")
        .replace(/^\.+/, "")
        .slice(0, 180) || "resume.pdf";
    return this.service.create(
      req.actor,
      id,
      file,
      filename,
      String(req.res?.getHeader("X-Request-ID")),
    );
  }
  @Get("resumes/:id/content")
  @RequireAction("resumes.read")
  async download(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, filename } = await this.service.download(
      req.actor,
      id,
      String(res.getHeader("X-Request-ID")),
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(stream, {
      type: "application/pdf",
      disposition: `attachment; filename="${filename.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
    });
  }
}
