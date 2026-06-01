import { test, expect } from "@playwright/test";

test.describe("language switcher", () => {
  test("switching to Arabic flips the document to RTL", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", "en");

    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByRole("menuitem", { name: "العربية" }).click();

    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    // Restore English so the shared server cookie doesn't leak into later specs.
    await page.getByRole("button", { name: "Change language" }).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(html).toHaveAttribute("dir", "ltr");
  });
});
