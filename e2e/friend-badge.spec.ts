import path from "node:path";
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * Validates the friend-request activity badge (the "Instagram dot"): a client
 * with a pending incoming request sees an indicator on the account menu without
 * any manual action. State is seeded by globalSetup (e2e/.fixtures.json).
 */
type Fixtures = {
  requester: { email: string; password: string; name: string };
  addressee: { email: string; password: string; name: string };
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
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
}

test.describe("friend-request activity badge", () => {
  const fx = loadFixtures();

  test("addressee sees the unseen-activity indicator + count", async ({ page }) => {
    await signIn(page, fx.addressee.email, fx.addressee.password);

    // The account-menu trigger announces the unseen count in its accessible
    // name — this is the screen-reader-visible half of the red dot.
    await expect(
      page.getByRole("button", { name: /open account menu, 1 new/i }),
    ).toBeVisible();

    // Opening the menu, the Friends row carries a "1" count pill.
    await page.getByRole("button", { name: /open account menu/i }).click();
    const friends = page.getByRole("menuitem", { name: /friends/i });
    await expect(friends).toBeVisible();
    await expect(friends).toContainText("1");
  });

  test("sender (outgoing request) shows no incoming badge", async ({ page }) => {
    await signIn(page, fx.requester.email, fx.requester.password);
    // No "N new" variant of the trigger should exist for the sender.
    await expect(
      page.getByRole("button", { name: /open account menu, \d+ new/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /open account menu/i })).toBeVisible();
  });
});
