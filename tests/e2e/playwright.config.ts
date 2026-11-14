import { defineConfig } from '@playwright/test';

const API_PORT = 3100;
const WEB_PORT = 5273;

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${WEB_PORT}`, trace: 'retain-on-failure' },
  webServer: [
    {
      // API thật dùng DB dev trong .env; mỗi test đăng ký email ngẫu nhiên.
      command: 'pnpm --filter @rms/api build && node ../../apps/api/dist/main.js',
      env: { API_PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @rms/web exec vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
