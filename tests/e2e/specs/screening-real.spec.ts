import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * E2E thật cho sàng lọc: upload CV Kaggle → ready → JD 5 tiêu chí của spike → chạy sàng lọc trên UI
 * → bảng tiêu chí có trích dẫn tô sáng, điểm và độ phủ.
 * Cần ai-service + Ollama (scripts/dev-ai.sh) và dữ liệu trong data/ (không commit).
 * Chạy: E2E_REAL_AI=1 pnpm test:e2e
 */
test.skip(!process.env.E2E_REAL_AI, 'Đặt E2E_REAL_AI=1 để chạy với AI thật');
test.setTimeout(15 * 60_000);

const CRITERIA = [
  { code: 'backend', label: 'Backend', description: 'Có kinh nghiệm thực tế phát triển backend hoặc API', weight: 30, priority: 'must_have' },
  { code: 'database', label: 'Cơ sở dữ liệu', description: 'Có kinh nghiệm làm việc với cơ sở dữ liệu quan hệ (SQL, PostgreSQL, MySQL)', weight: 25, priority: 'nice_to_have' },
  { code: 'cloud', label: 'Docker / Cloud', description: 'Có kinh nghiệm triển khai ứng dụng bằng Docker hoặc dịch vụ cloud', weight: 20, priority: 'nice_to_have' },
  { code: 'teamwork', label: 'Làm việc nhóm', description: 'Có kinh nghiệm làm việc nhóm theo quy trình Agile hoặc Scrum', weight: 15, priority: 'nice_to_have' },
  { code: 'english', label: 'Tiếng Anh', description: 'Có khả năng đọc hiểu tài liệu tiếng Anh, thể hiện qua chứng chỉ hoặc CV', weight: 10, priority: 'nice_to_have' },
];

function pickPdf(): string {
  const root = path.resolve(__dirname, '../../../data');
  const all: string[] = [];
  for (const d of fs.readdirSync(root)) {
    const dir = path.join(root, d);
    if (fs.statSync(dir).isDirectory()) for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.pdf')) all.push(path.join(dir, f));
  }
  const first = all.sort()[0];
  if (!first) throw new Error('Không có PDF nào trong data/');
  return first;
}

test('sàng lọc 1 CV Kaggle với 5 tiêu chí → kết quả có trích dẫn khớp CV, điểm và độ phủ', async ({ page, request }) => {
  const stamp = Date.now();
  const email = `e2e-screen-${stamp}@example.com`;
  const reg = await request.post('/api/v1/auth/register', {
    data: { email, password: 'correct-horse-battery', display_name: 'E2E Screening', organization_name: `E2E Screen Org ${stamp}` },
  });
  expect(reg.status()).toBe(201);
  const auth = { Authorization: `Bearer ${(await reg.json()).access_token}` };

  const job = await (await request.post('/api/v1/jobs', { headers: auth, data: { title: 'Backend Engineer' } })).json();
  const jd = await (await request.post(`/api/v1/jobs/${job.id}/jd/versions`, { headers: auth, data: {} })).json();
  expect((await request.put(`/api/v1/jobs/${job.id}/jd/versions/${jd.id}/criteria`, { headers: auth, data: { criteria: CRITERIA } })).status()).toBe(200);
  expect((await request.post(`/api/v1/jobs/${job.id}/jd/versions/${jd.id}/approve`, { headers: auth })).status()).toBe(200);
  const cand = await (await request.post('/api/v1/candidates', { headers: auth, data: { display_name: 'Ứng viên Kaggle' } })).json();
  const pdf = pickPdf();
  const up = await request.post('/api/v1/resumes/upload', {
    headers: auth,
    multipart: { candidate_id: cand.id, file: { name: 'cv.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(pdf) } },
  });
  expect(up.status()).toBe(201);
  const resume = await up.json();
  expect((await request.post(`/api/v1/jobs/${job.id}/applications`, { headers: auth, data: { candidate_id: cand.id, resume_id: resume.id } })).status()).toBe(201);

  // Đăng nhập trên UI rồi chạy sàng lọc. CV có thể còn đang xử lý: run tự chờ ở waiting_document rồi chạy tiếp.
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByTestId('active-org')).toBeVisible();
  await page.goto(`/jobs/${job.id}`);
  const started = Date.now();
  await page.getByTestId('application').getByRole('button', { name: 'Sàng lọc' }).click();
  await expect(page.getByTestId('run-status')).toHaveText('Hoàn tất', { timeout: 12 * 60_000 });
  console.log(JSON.stringify({ upload_or_click_to_completed_seconds: Math.round((Date.now() - started) / 1000) }));

  await expect(page.getByTestId('score')).toBeVisible();
  for (const c of CRITERIA) await expect(page.getByTestId(`criterion-${c.code}`)).toBeVisible();

  // Mọi mức đã kết luận phải có ít nhất một trích dẫn tô sáng; mức khác thì không bị ép.
  for (const row of await page.locator('[data-testid^="criterion-"]').all()) {
    const level = (await row.getByTestId('level').textContent()) ?? '';
    if (!['Chưa rõ', 'Cần xem lại'].includes(level)) await expect(row.locator('mark').first()).toBeVisible();
  }
  // Mỗi chữ được tô sáng phải là văn bản thật của CV (offset khớp), không phải do model bịa.
  const marks = await page.locator('mark').allTextContents();
  const cvText = await (await request.get(`/api/v1/jobs/${job.id}/screenings`, { headers: auth })).json().then(async (l) => {
    const d = await (await request.get(`/api/v1/jobs/${job.id}/screenings/${l.items[0].id}`, { headers: auth })).json();
    return d.cv_text as string;
  });
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  for (const m of marks) expect(norm(cvText)).toContain(norm(m));
});
