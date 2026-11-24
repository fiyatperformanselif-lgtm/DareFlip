import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 60_000,
  outputDir: '../../artifacts/accessibility-playwright',
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../../artifacts/accessibility-report.json', import.meta.url)) }]],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
    reducedMotion: 'reduce',
    launchOptions: { executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
