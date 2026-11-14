import { PDFDocument } from 'pdf-lib';
import { strToU8, zipSync } from 'fflate';

export async function makePdf(pages = 1, marker = 'x'): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${marker}-${Math.random()}`);
  for (let i = 0; i < pages; i++) doc.addPage().drawText(`Page ${i + 1} ${marker}`);
  return Buffer.from(await doc.save());
}

const CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>';

export function makeDocx(extra: Record<string, Uint8Array> = {}, body = 'Hello'): Buffer {
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8(CT),
    'word/document.xml': strToU8(`<w:document><w:body>${body}</w:body></w:document>`),
    ...extra,
  }, { level: 9 }));
}

export const PDF = 'application/pdf';
export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
