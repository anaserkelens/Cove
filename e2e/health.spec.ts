import { expect, test } from "@playwright/test";

test("health route reports a safe status", async ({ page }) => {
  const response = await page.goto("/health");
  expect(response?.ok()).toBe(true);

  const body = await page.textContent("body");
  expect(body).toContain('"status":"ok"');
  expect(body).not.toContain("SUPABASE");
});
