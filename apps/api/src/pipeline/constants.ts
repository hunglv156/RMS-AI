/**
 * Phiên bản pipeline xử lý tài liệu = parser + prompt trích xuất. Phải khớp `PIPELINE_VERSION`
 * (parse-v1) và `EXTRACT_PROMPT_VERSION` (extract-slim-v1) trong ai-service. Đổi một trong hai thì
 * tăng ở đây để tài liệu được xử lý lại; cùng sha256 + cùng phiên bản thì không chạy lại.
 */
export const PIPELINE_VERSION = 'parse-v1/extract-slim-v1';

export const QUEUE_PARSE = 'doc-parse';
export const QUEUE_EXTRACT = 'doc-extract';
export const QUEUE_DEAD = 'doc-dead';

export const JOB_PARSE = 'document.parse';
export const JOB_EXTRACT = 'document.extract';

export interface DocumentJobData {
  outboxId: string;
  organization_id: string;
  resume_id: string;
  actor_id: string | null;
}
