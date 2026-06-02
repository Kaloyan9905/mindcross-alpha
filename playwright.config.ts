import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. The app runs on a dedicated port (3100) so it never collides with
 * the local Docker container on :3000, while sharing the same Docker Postgres.
 *
 * The webServer builds then starts the app on :3100 (PLAYWRIGHT=1 disables
 * standalone output so `next start` serves cleanly), reusing an existing server
 * across runs. `globalSetup` seeds a deterministic friend request so the
 * activity-badge spec has real state.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  // One real Postgres, shared across tests — run serially to avoid cross-test
  // state races (mirrors the vitest setup).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Grant camera/mic with a synthetic device so the meeting room can call
        // getUserMedia headlessly without a real webcam or a permission prompt.
        permissions: ["camera", "microphone"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: true,
    // Match Auth.js host to the e2e port so credential sign-in / redirects work,
    // keep cookies non-secure on plain http, and disable standalone output so
    // `next start` works (PLAYWRIGHT is read by next.config.ts at build time).
    env: {
      AUTH_URL: BASE_URL,
      AUTH_TRUST_HOST: "true",
      PLAYWRIGHT: "1",
    },
  },
});
