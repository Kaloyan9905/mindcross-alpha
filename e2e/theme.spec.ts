import { test, expect } from "@playwright/test";

test.describe("dark mode", () => {
  test("toggles and survives a reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");

    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(html).toHaveClass(/dark/);

    // The no-flash boot script re-applies the saved preference before paint.
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitem", { name: "Light" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });
});
