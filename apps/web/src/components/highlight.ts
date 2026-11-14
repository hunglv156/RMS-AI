export interface Snippet {
  before: string;
  quote: string;
  after: string;
  /** Có cắt bớt văn bản ở đầu/cuối đoạn trích. */
  cutBefore: boolean;
  cutAfter: boolean;
}

/**
 * Đoạn trích có ngữ cảnh quanh một trích dẫn, theo offset do ai-service trả về `[start, end)`.
 * Offset không khớp với văn bản (CV đã đổi) thì không tô sáng, chỉ trả lại trích dẫn.
 */
export function snippet(cvText: string | null, quote: string, start: number, end: number, context = 80): Snippet {
  const ok = cvText !== null && start >= 0 && end <= cvText.length && start < end && cvText.slice(start, end) === quote;
  if (!ok || cvText === null) return { before: '', quote, after: '', cutBefore: false, cutAfter: false };
  const from = Math.max(0, start - context);
  const to = Math.min(cvText.length, end + context);
  return {
    before: cvText.slice(from, start), quote, after: cvText.slice(end, to), cutBefore: from > 0, cutAfter: to < cvText.length,
  };
}
