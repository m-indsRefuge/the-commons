import { expect, test } from "@playwright/test";

test("Commons shell loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "The Commons" }),
  ).toBeVisible();
});
