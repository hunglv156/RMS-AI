// One stack per invocation; live is opt-in through the package's test:live alias.
const live = process.env.T8_LIVE === "1";
process.env.T8_E2E_RUN_ID ||= String(Date.now());
const tag = process.env.T8_E2E_RUN_ID;
export default {
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  grepInvert: live ? undefined : /@live/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 360_000,
  expect: { timeout: 15_000 },
  outputDir: `tests/e2e/test-results/pw-${tag}`,
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: `tests/e2e/playwright-report/${tag}`, open: "never" },
    ],
    ["json", { outputFile: `tests/e2e/test-results/report-${tag}.json` }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    channel: process.env.T8_BROWSER_CHANNEL || undefined,
    viewport: { width: 1440, height: 900 },
    // support.ts saves each context's actual trace without the ZIP merge path.
    trace: "off",
    screenshot: "on",
  },
  webServer: {
    command: `node scripts/verify-t8.mjs --serve${live ? " --live" : ""}`,
    url: "http://127.0.0.1:3199/health",
    reuseExistingServer: false,
    timeout: 180_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
    stdout: "pipe",
    stderr: "pipe",
  },
};
