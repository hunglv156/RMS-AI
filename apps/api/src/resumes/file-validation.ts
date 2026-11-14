import { PDFDocument } from 'pdf-lib';
import unzipper from 'unzipper';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 20;
// Chống zip bomb với DOCX.
export const MAX_ZIP_ENTRIES = 500;
export const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_COMPRESSION_RATIO = 100;

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class FileRejected extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}

export interface ValidatedFile {
  mime: typeof PDF_MIME | typeof DOCX_MIME;
  pageCount: number | null;
}

const startsWith = (b: Buffer, sig: number[]): boolean => sig.every((v, i) => b[i] === v);

/**
 * Tin vào nội dung chứ không tin tên file hay Content-Type: magic bytes phải khớp cả hai.
 */
export async function validateResumeFile(
  buf: Buffer,
  filename: string,
  declaredMime: string,
): Promise<ValidatedFile> {
  if (buf.length === 0) throw new FileRejected('File rỗng');
  if (buf.length > MAX_FILE_BYTES) throw new FileRejected('File vượt quá 10MB');
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const isPdf = startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  const isZip = startsWith(buf, [0x50, 0x4b, 0x03, 0x04]); // PK\3\4

  if (isPdf) {
    if (ext !== 'pdf' || declaredMime !== PDF_MIME) {
      throw new FileRejected('Nội dung là PDF nhưng đuôi file hoặc Content-Type không khớp');
    }
    return { mime: PDF_MIME, pageCount: await countPdfPages(buf) };
  }
  if (isZip) {
    if (ext !== 'docx' || declaredMime !== DOCX_MIME) {
      throw new FileRejected('Nội dung là DOCX nhưng đuôi file hoặc Content-Type không khớp');
    }
    await inspectDocx(buf);
    return { mime: DOCX_MIME, pageCount: null };
  }
  throw new FileRejected('Chỉ chấp nhận PDF hoặc DOCX');
}

async function countPdfPages(buf: Buffer): Promise<number> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
  } catch {
    throw new FileRejected('PDF hỏng hoặc được mã hoá');
  }
  const n = doc.getPageCount();
  if (n < 1) throw new FileRejected('PDF không có trang nào');
  if (n > MAX_PAGES) throw new FileRejected(`PDF vượt quá ${MAX_PAGES} trang`);
  return n;
}

async function inspectDocx(buf: Buffer): Promise<void> {
  let files: Array<{ path: string; uncompressedSize: number; compressedSize: number; type: string }>;
  try {
    const d = await unzipper.Open.buffer(buf);
    files = d.files as typeof files;
  } catch {
    throw new FileRejected('DOCX hỏng');
  }
  if (files.length > MAX_ZIP_ENTRIES) throw new FileRejected('DOCX có quá nhiều phần tử');
  let total = 0;
  for (const f of files) {
    if (f.path.includes('..') || f.path.startsWith('/') || f.path.includes('\\')) {
      throw new FileRejected('DOCX chứa đường dẫn không an toàn');
    }
    total += f.uncompressedSize;
    if (total > MAX_UNCOMPRESSED_BYTES) throw new FileRejected('DOCX giải nén quá lớn (nghi zip bomb)');
    if (f.compressedSize > 0 && f.uncompressedSize / f.compressedSize > MAX_COMPRESSION_RATIO) {
      throw new FileRejected('Tỷ lệ nén bất thường (nghi zip bomb)');
    }
  }
  const names = new Set(files.map((f) => f.path));
  if (!names.has('[Content_Types].xml') || !names.has('word/document.xml')) {
    throw new FileRejected('Không phải tài liệu DOCX hợp lệ');
  }
  if ([...names].some((n) => /vbaProject\.bin$/i.test(n) || /^word\/embeddings\//i.test(n))) {
    throw new FileRejected('DOCX chứa macro hoặc đối tượng nhúng');
  }
}
