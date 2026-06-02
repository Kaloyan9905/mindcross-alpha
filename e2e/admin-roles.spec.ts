import path from "node:path";
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * The superuser role-assignment flow: a super admin opens /admin/users, changes
 * a user's role via the dialog, and the row's role badge updates. State is
 * seeded by globalSetup (e2e/.fixtures.json).
 */
type Fixtures = {
  admin: { email: string; password: string };
  roleTarget: { email: string; name: string };
};

function loadFixtures(): Fixtures {
  const file = path.resolve(process.cwd(), "e2e/.fixtures.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Fixtures;
  } catch {
    throw new Error(`Missing ${file} — globalSetup (scripts/e2e-setup.ts) did not run.`);
  }
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 });
}

test.describe("admin role assignment", () => {
  const fx = loadFixtures();

  test("a super admin changes a user's role", async ({ page }) => {
    await signIn(page, fx.admin.email, fx.admin.password);
    await page.goto("/admin/users");

    const targetRow = () =>
      page.getByRole("row").filter({ hasText: fx.roleTarget.email });
    await expect(targetRow()).toContainText("client");

    await targetRow().getByRole("button", { name: /change role/i }).click();
    // The dialog + select render in a portal — drive them at the page level.
    await page.getByRole("combobox", { name: "Role" }).click();
    await page.getByRole("option", { name: "Therapist" }).click();
    await page.getByRole("button", { name: /save role/i }).click();

    // After the action + refresh, the row's role badge reads "therapist".
    await expect(targetRow()).toContainText("therapist", { timeout: 10_000 });
  });
});
