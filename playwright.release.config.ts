import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const baseURL = "http://127.0.0.1:5183";

export default defineConfig({
  testDir: "./tests/release",
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8000 },
  outputDir: "artifacts/release-playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/release-report.json" }],
  ],
  use: {
    baseURL,
    browserName: "chromium",
    locale: "en-US",
    reducedMotion: "reduce",
    actionTimeout: 15_000,
    launchOptions: {
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet",
      use: {
        viewport: { width: 1024, height: 1366 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Test-process fixture only: does not write .env or activate a release profile.
    command: "VITE_ADS_ENABLED=false npm run dev -- --port 5183 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
