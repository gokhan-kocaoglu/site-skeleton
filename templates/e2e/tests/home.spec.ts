import { expect, test } from "@playwright/test";

test.describe("home page smoke", () => {
  test("loads with a single h1 and a title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Site Skeleton/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
