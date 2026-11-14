#!/usr/bin/env node
/**
 * Benchmark M4.4 trên hệ thống thật: upload CV Kaggle → ready → sàng lọc từng CV một (5 tiêu chí spike).
 * Cần: hạ tầng (pnpm infra:up), API đang chạy, ai-service + Ollama (scripts/dev-ai.sh), data/ có PDF.
 *   BENCH_API=http://127.0.0.1:3100 node scripts/bench-screening.mjs [số CV=5] [--out docs/benchmarks/m4-screening.md]
 * Tiêu chí đạt (M4.4): trung vị ≤ 40s/CV, 100% JSON hợp lệ, ≥ 85% trích dẫn khớp nguyên văn,
 * không kết luận nào thiếu bằng chứng hợp lệ.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = `${process.env.BENCH_API ?? 'http://127.0.0.1:3100'}/api/v1`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : null;
const n = Number(args.find((a, i) => /^\d+$/.test(a) && i !== outIdx + 1) ?? 5);

const CRITERIA = [
  { code: 'backend', label: 'Backend', description: 'Có kinh nghiệm thực tế phát triển backend hoặc API', weight: 30, priority: 'must_have' },
  { code: 'database', label: 'Cơ sở dữ liệu', description: 'Có kinh nghiệm làm việc với cơ sở dữ liệu quan hệ (SQL, PostgreSQL, MySQL)', weight: 25, priority: 'nice_to_have' },
  { code: 'cloud', label: 'Docker / Cloud', description: 'Có kinh nghiệm triển khai ứng dụng bằng Docker hoặc dịch vụ cloud', weight: 20, priority: 'nice_to_have' },
  { code: 'teamwork', label: 'Làm việc nhóm', description: 'Có kinh nghiệm làm việc nhóm theo quy trình Agile hoặc Scrum', weight: 15, priority: 'nice_to_have' },
  { code: 'english', label: 'Tiếng Anh', description: 'Có khả năng đọc hiểu tài liệu tiếng Anh, thể hiện qua chứng chỉ hoặc CV', weight: 10, priority: 'nice_to_have' },
];
const CONCLUDED = ['strong', 'adequate', 'partial', 'absent'];

function pickPdfs(count) {
  const dataDir = path.join(root, 'data');
  const all = [];
  for (const d of fs.readdirSync(dataDir)) {
    const dir = path.join(dataDir, d);
    if (fs.statSync(dir).isDirectory()) for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.pdf')) all.push(path.join(dir, f));
  }
  // Cùng cách chọn cố định như E2E để so được qua các lần chạy.
  return all.sort().filter((_, i) => i % Math.floor(all.length / count) === 0).slice(0, count);
}

let token = '';
async function call(method, p, body, headers = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const stamp = Date.now();
const reg = await fetch(`${API}/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `bench-${stamp}@example.com`, password: 'correct-horse-battery', display_name: 'Bench', organization_name: `Bench ${stamp}` }),
});
if (!reg.ok) throw new Error(`register → ${reg.status}`);
token = (await reg.json()).access_token;

const job = await call('POST', '/jobs', { title: 'Backend Engineer' });
const jd = await call('POST', `/jobs/${job.id}/jd/versions`, {});
await call('PUT', `/jobs/${job.id}/jd/versions/${jd.id}/criteria`, { criteria: CRITERIA });
await call('POST', `/jobs/${job.id}/jd/versions/${jd.id}/approve`);

const pdfs = pickPdfs(n);
console.log(`Upload ${pdfs.length} CV…`);
const t0 = Date.now();
const apps = [];
for (const [i, pdf] of pdfs.entries()) {
  const cand = await call('POST', '/candidates', { display_name: `Bench ${i + 1}` });
  const fd = new FormData();
  fd.append('candidate_id', cand.id);
  fd.append('file', new Blob([fs.readFileSync(pdf)], { type: 'application/pdf' }), 'cv.pdf');
  const resume = await call('POST', '/resumes/upload', fd);
  const app = await call('POST', `/jobs/${job.id}/applications`, { candidate_id: cand.id, resume_id: resume.id });
  apps.push({ id: app.id, resume: resume.id, file: path.relative(root, pdf) });
}
for (const a of apps) {
  for (;;) {
    const s = await call('GET', `/resumes/${a.resume}/status`);
    if (['ready', 'rejected', 'failed_extraction', 'failed_provider'].includes(s.parse_status)) { a.doc = s.parse_status; break; }
    await sleep(2000);
  }
}
const docSeconds = Math.round((Date.now() - t0) / 1000);
console.log(`Tài liệu xong sau ${docSeconds}s: ${apps.map((a) => a.doc).join(', ')}`);

// Sàng lọc tuần tự, mỗi lượt đo từ lúc tạo đến lúc hoàn tất (hàng đợi rỗng nên không tính thời gian chờ).
const rows = [];
for (const a of apps.filter((x) => x.doc === 'ready')) {
  const start = Date.now();
  const run = await call('POST', `/jobs/${job.id}/screenings`, { application_id: a.id }, { 'Idempotency-Key': `bench-${stamp}-${a.id}` });
  let detail;
  for (;;) {
    detail = await call('GET', `/jobs/${job.id}/screenings/${run.id}`);
    if (['completed', 'failed_validation', 'failed_provider', 'cancelled'].includes(detail.status)) break;
    await sleep(1000);
  }
  const wall = (Date.now() - start) / 1000;
  const valid = detail.results.reduce((s, r) => s + r.evidence.length, 0);
  const bad = detail.results.reduce((s, r) => s + r.notes.filter((x) => x.startsWith('evidence_')).length, 0);
  rows.push({
    file: a.file, status: detail.status, seconds: wall, llm_seconds: detail.timings?.llm_seconds ?? null, calls: detail.timings?.calls ?? null,
    score: detail.observed_score, coverage: detail.coverage, quotesValid: valid, quotesInvalid: bad,
    levels: Object.fromEntries(detail.results.map((r) => [r.code, r.level])),
    concludedWithoutEvidence: detail.results.filter((r) => CONCLUDED.includes(r.level) && r.evidence.length === 0).length,
  });
  console.log(`${a.file}: ${detail.status} ${wall.toFixed(1)}s`);
}

const done = rows.filter((r) => r.status === 'completed');
const quotes = rows.reduce((s, r) => s + r.quotesValid + r.quotesInvalid, 0);
const metrics = {
  cvs: rows.length,
  medianSeconds: rows.length ? Number(median(rows.map((r) => r.seconds)).toFixed(1)) : null,
  maxSeconds: rows.length ? Number(Math.max(...rows.map((r) => r.seconds)).toFixed(1)) : null,
  validJson: `${done.length}/${rows.length}`,
  quotesVerbatim: quotes ? `${rows.reduce((s, r) => s + r.quotesValid, 0)}/${quotes}` : 'n/a',
  quoteRate: quotes ? rows.reduce((s, r) => s + r.quotesValid, 0) / quotes : null,
  concludedWithoutEvidence: rows.reduce((s, r) => s + r.concludedWithoutEvidence, 0),
  retried: rows.filter((r) => (r.calls ?? 1) > 1).length,
};
const pass = {
  median: metrics.medianSeconds !== null && metrics.medianSeconds <= 40,
  json: rows.length > 0 && done.length === rows.length,
  quotes: metrics.quoteRate === null || metrics.quoteRate >= 0.85,
  evidence: metrics.concludedWithoutEvidence === 0,
};
console.log(JSON.stringify({ metrics, pass, rows }, null, 2));

if (out) {
  const md = `# Benchmark sàng lọc M4.4 (${new Date().toISOString().slice(0, 10)})

Hệ thống thật: upload → hàng đợi → trích xuất → chấm gộp 5 tiêu chí (Qwen3 14B qua Ollama, \`think: false\`). \
Mỗi CV được sàng lọc tuần tự sau khi tài liệu đã \`ready\`; thời gian là từ lúc tạo run đến lúc \`completed\`, gồm một lượt LLM và ghi DB.
Tài liệu: ${rows.length} CV Kaggle, ${docSeconds}s từ upload đến khi tất cả \`ready\` (gồm OCR và trích xuất).

| Tiêu chí | Ngưỡng | Kết quả | Đạt |
|---|---|---|---|
| Trung vị thời gian một CV | ≤ 40s | ${metrics.medianSeconds}s (lâu nhất ${metrics.maxSeconds}s) | ${pass.median ? '✅' : '❌'} |
| JSON hợp lệ | 100% | ${metrics.validJson} lượt hoàn tất (${metrics.retried} lượt phải gọi lại) | ${pass.json ? '✅' : '❌'} |
| Trích dẫn khớp nguyên văn | ≥ 85% | ${metrics.quotesVerbatim}${metrics.quoteRate === null ? '' : ` (${(metrics.quoteRate * 100).toFixed(0)}%)`} | ${pass.quotes ? '✅' : '❌'} |
| Kết luận thiếu bằng chứng hợp lệ | 0 | ${metrics.concludedWithoutEvidence} | ${pass.evidence ? '✅' : '❌'} |

| CV | Trạng thái | Giây | Điểm | Độ phủ | Mức theo tiêu chí |
|---|---|---:|---:|---:|---|
${rows.map((r) => `| ${r.file} | ${r.status} | ${r.seconds.toFixed(1)} | ${r.score ?? '–'} | ${r.coverage ?? '–'} | ${Object.entries(r.levels).map(([k, v]) => `${k}=${v}`).join(', ')} |`).join('\n')}

Giới hạn: ${rows.length} CV, mỗi CV một lần chạy; chưa có nhãn nên chưa đo độ đúng của mức đánh giá. Số "trích dẫn khớp" tính trên mọi trích dẫn model trả về, trước khi loại trích dẫn sai.
`;
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  fs.writeFileSync(path.join(root, out), md);
  console.log(`Đã ghi ${out}`);
}
process.exit(Object.values(pass).every(Boolean) ? 0 : 1);
