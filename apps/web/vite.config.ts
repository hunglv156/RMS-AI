import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // contracts là CommonJS (dùng chung với NestJS): buộc Vite pre-bundle sang ESM ở chế độ dev.
  optimizeDeps: { include: ['@rms/contracts'] },
  server: { host: '127.0.0.1', port: 5173, proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000' } },
});
