import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('tạo org → tạo job → tạo ứng viên → upload CV', async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Tên hiển thị').fill('E2E User');
  await page.getByLabel('Tên tổ chức').fill(`E2E Org ${stamp}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

  // Sau khi đăng ký, tổ chức đang active là tổ chức vừa tạo.
  await expect(page.getByTestId('active-org')).toContainText(`E2E Org ${stamp}`);
  await expect(page.getByTestId('active-org')).toContainText('owner');

  // Chọn tổ chức
  await page.getByRole('link', { name: 'Tổ chức' }).click();
  await expect(page.getByText('Đang dùng')).toBeVisible();

  // Job
  await page.getByRole('link', { name: 'Vị trí tuyển dụng' }).click();
  await page.getByLabel('Tên vị trí').fill('Backend Engineer');
  await page.getByRole('button', { name: 'Tạo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Backend Engineer' })).toBeVisible();
  await page.getByRole('link', { name: 'Backend Engineer' }).click();
  await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();

  // Ứng viên
  await page.getByRole('link', { name: 'Ứng viên' }).click();
  await page.getByLabel('Họ tên').fill('Nguyễn Văn A');
  await page.getByRole('button', { name: 'Thêm', exact: true }).click();
  await page.getByRole('link', { name: 'Nguyễn Văn A' }).click();

  // Upload CV
  const doc = await PDFDocument.create();
  doc.setTitle(`cv-${stamp}`);
  doc.addPage().drawText('Curriculum Vitae');
  const pdf = Buffer.from(await doc.save());
  await page.locator('input[type=file]').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByText('cv.pdf')).toBeVisible();
  await expect(page.getByTestId('resume-status').first()).toBeVisible();

  // File giả mạo bị từ chối và hiện lỗi
  await page.locator('input[type=file]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await expect(page.getByRole('alert')).toContainText('PDF');

  // Đăng xuất
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
});
