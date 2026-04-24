import { defineConfig, devices } from "@playwright/test";

// Playwright — end-to-end tests against a running Next.js dev server.
// Keeps the surface small for Phase 1 (smoke: homepage, /browse, email
// preview index). Auth'd flows land in a later phase once we have a seeded
// test account strategy.

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["junit", { outputFile: "test-results/playwright.xml" }]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Headless in CI, headed locally if PWDEBUG is set.
    headless: !process.env.PWDEBUG,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Add firefox / webkit later — not needed for smoke.
  ],

  // Reuse an already-running dev server in dev. In CI, boot it ourselves.
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        port: PORT,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: "npm run dev",
        port: PORT,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
