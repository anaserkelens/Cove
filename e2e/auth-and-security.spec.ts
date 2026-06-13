import { expect, test } from "@playwright/test";

test("public auth pages expose accessible form controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/password-reset");
  await expect(
    page.getByRole("heading", { name: "Reset password" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("login next parameter rejects open redirects", async ({ page }) => {
  await page.goto("/login?next=https://example.com/phish");

  await expect(page.locator('input[name="redirectTo"]')).toHaveValue("/app");
});

test("unauthenticated users are redirected away from app routes", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp&error=missing-session/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  await page.goto("/app/11111111-1111-1111-1111-111111111111/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp&error=missing-session/);
});

test("responses include baseline security headers", async ({ page }) => {
  const response = await page.goto("/health");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response?.headers()["permissions-policy"]).toContain("camera=()");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
});
