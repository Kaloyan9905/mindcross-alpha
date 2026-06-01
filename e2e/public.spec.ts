import { test, expect } from "@playwright/test";

/** Public surfaces that must render for anonymous visitors. */
const PAGES = [
  "/",
  "/find-a-therapist",
  "/our-mission",
  "/crisis-support",
  "/privacy",
  "/disclaimer",
  "/login",
  "/register",
];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`renders ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res, `no response for ${path}`).not.toBeNull();
      expect(res!.status(), `bad status for ${path}`).toBeLessThan(400);
      // The site chrome + at least one heading are present (not an error page).
      await expect(page.getByRole("link", { name: /MindCross/i }).first()).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Application error/i);
    });
  }

  test("anonymous navbar offers sign in / sign up", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^log in$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^sign up$/i }).first()).toBeVisible();
  });

  test("navbar link goes to the therapist directory", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /find a therapist/i }).first().click();
    await expect(page).toHaveURL(/\/find-a-therapist/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
