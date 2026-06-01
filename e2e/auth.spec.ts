import { test, expect } from "@playwright/test";

const PASSWORD = "e2e-correct-horse-staple";

function uniqueEmail() {
  // Math.random is fine here — specs run in Node, not the workflow sandbox.
  return `e2e-signup-${Date.now()}-${Math.floor(Math.random() * 1e6)}@mindcross.test`;
}

test.describe("auth round-trip", () => {
  test("register → land on account → sign out → sign back in", async ({ page }) => {
    const email = uniqueEmail();

    // ---- Register ----
    await page.goto("/register");
    await page.getByLabel("Full name").fill("E2E Signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
    const accountMenu = page.getByRole("button", { name: /open account menu/i });
    await expect(accountMenu).toBeVisible();

    // ---- Sign out ----
    await accountMenu.click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("link", { name: /^log in$/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    // ---- Sign back in ----
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
    await expect(page.getByRole("button", { name: /open account menu/i })).toBeVisible();
  });

  test("wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@mindcross.test");
    await page.getByLabel("Password", { exact: true }).fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  });
});
