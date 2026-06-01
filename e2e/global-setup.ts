import { execSync } from "node:child_process";

/**
 * Runs once before the e2e suite. Delegates DB seeding to a tsx script so the
 * app's `@/...` modules resolve through tsx (Playwright's own loader never
 * touches application code). The script writes `e2e/.fixtures.json`.
 */
export default function globalSetup() {
  execSync("pnpm exec tsx scripts/e2e-setup.ts", { stdio: "inherit" });
}
