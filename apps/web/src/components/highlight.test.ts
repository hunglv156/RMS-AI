import { describe, expect, it } from 'vitest';
import { snippet } from './highlight';

const CV = 'Intro line. Built REST APIs with FastAPI for three years. Outro line.';
const QUOTE = 'REST APIs with FastAPI';
const START = CV.indexOf(QUOTE);

describe('snippet', () => {
  it('tô sáng đúng trích dẫn theo offset và giữ ngữ cảnh', () => {
    const s = snippet(CV, QUOTE, START, START + QUOTE.length, 6);
    expect(s).toEqual({ before: 'Built ', quote: QUOTE, after: ' for t', cutBefore: true, cutAfter: true });
  });

  it('không cắt khi ngữ cảnh chạm đầu/cuối văn bản', () => {
    const s = snippet(CV, 'Intro line.', 0, 11, 500);
    expect(s.cutBefore).toBe(false);
    expect(s.cutAfter).toBe(false);
    expect(s.before + s.quote + s.after).toBe(CV);
  });

  it('offset không khớp văn bản thì chỉ trả trích dẫn, không tô sai chỗ', () => {
    expect(snippet(CV, QUOTE, 0, QUOTE.length)).toEqual({ before: '', quote: QUOTE, after: '', cutBefore: false, cutAfter: false });
    expect(snippet(CV, QUOTE, START, CV.length + 5).before).toBe('');
  });

  it('không có văn bản CV thì chỉ trả trích dẫn', () => {
    expect(snippet(null, QUOTE, START, START + QUOTE.length)).toMatchObject({ before: '', quote: QUOTE, after: '' });
  });
});
