import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * E2E thật: upload PDF Kaggle → worker → ai-service → Ollama → hồ sơ hiện trên UI.
 * Cần ai-service và Ollama đang chạy (scripts/dev-ai.sh) và dữ liệu trong data/ (không commit).
 * Chạy: E2E_REAL_AI=1 pnpm test:e2e
 */
test.skip(!process.env.E2E_REAL_AI, 'Đặt E2E_REAL_AI=1 để chạy với AI thật');
test.setTimeout(15 * 60_000);

function pickPdfs(n: number): string[] {
  const root = path.resolve(__dirname, '../../../data');
  const all: string[] = [];
  for (const d of fs.readdirSync(root)) {
    const dir = path.join(root, d);
    if (fs.statSync(dir).isDirectory()) {
      for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.pdf')) all.push(path.join(dir, f));
    }
  }
  // Cùng seed với ai-service/tests/test_ollama_live.py: chọn cố định để so được qua các lần chạy.
  return all.sort().filter((_, i) => i % Math.floor(all.length / n) === 0).slice(0, n);
}

test('upload 2 PDF Kaggle → hồ sơ trích xuất xuất hiện trên UI, đo upload → ready', async ({ page }) => {
  const stamp = Date.now();
  await page.goto('/');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Tên hiển thị').fill('E2E AI');
  await page.getByLabel('Tên tổ chức').fill(`E2E AI Org ${stamp}`);
  await page.getByLabel('Email').fill(`e2e-ai-${stamp}@example.com`);
  await page.getByLabel('Mật khẩu').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByTestId('active-org')).toBeVisible();

  await page.getByRole('link', { name: 'Ứng viên' }).click();
  await page.getByLabel('Họ tên').fill('Ứng viên AI');
  await page.getByRole('button', { name: 'Thêm', exact: true }).click();
  await page.getByRole('link', { name: 'Ứng viên AI' }).click();

  const timings: Record<string, number> = {};
  const pdfs = pickPdfs(2);
  const started = Date.now();
  for (const pdf of pdfs) {
    await page.locator('input[type=file]').setInputFiles(pdf);
    timings[path.basename(path.dirname(pdf)) + '/' + path.basename(pdf)] = Date.now() - started;
  }
  await expect(page.getByText('Sẵn sàng')).toHaveCount(2, { timeout: 12 * 60_000 });
  const total = Date.now() - started;
  await expect(page.getByTestId('profile')).toHaveCount(2);
  for (const p of await page.getByTestId('profile').all()) {
    await expect(p).toContainText('qwen3:14b');
  }
  console.log(JSON.stringify({ cvs: pdfs.length, upload_to_all_ready_seconds: Math.round(total / 1000), per_cv_seconds: Math.round(total / 1000 / pdfs.length) }));
});
