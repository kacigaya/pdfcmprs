import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { TOOLS } from "../app/features/pdf/registry";

test("home catalog and settings are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid^=tool-card-]")).toHaveCount(TOOLS.length);
  await page.locator("#tool-search").fill("timestamp");
  await expect(page.locator("[data-testid=tool-card-timestamp-pdf]")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Language")).toBeEnabled();
  await page.getByLabel("Language").selectOption("ja");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pdfcmprs-settings-v1"))).toContain('"language":"ja"');
  await page.goto("/");
  await expect(page.locator("#tool-search")).toHaveAttribute("placeholder", /ツールを検索/);
});

test("settings import, export, reset, compact mode, and shortcuts work", async ({ page }) => {
  await page.goto("/settings");
  const compact = page.getByLabel("Compact content width");
  const shortcuts = page.getByLabel(/Keyboard shortcuts/);
  await compact.check();
  await shortcuts.uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-compact", "true");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export settings" }).click(),
  ]);
  expect(JSON.parse(readFileSync(await download.path(), "utf8"))).toEqual({ language: "en", compact: true, shortcuts: false });

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "settings.json", mimeType: "application/json", buffer: Buffer.from('{"language":"zh","compact":false,"shortcuts":true}') });
  await expect(page.getByLabel("Language")).toHaveValue("zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await input.setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{") });
  await expect(page.locator('p[role="alert"]')).toHaveText("That file is not valid settings JSON.");

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await page.keyboard.press("/");
  await expect(page.locator("#tool-search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#tool-search")).not.toBeFocused();

  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Language")).toHaveValue("en");
  await compact.check();
  await shortcuts.uncheck();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-compact", "true");
  await page.keyboard.press("/");
  await expect(page.locator("#tool-search")).not.toBeFocused();
});

test("headers, legacy redirects, PWA assets, and not-found page work", async ({ page, request }) => {
  const home = await request.get("/");
  expect(home.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  expect(home.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");

  await page.goto("/tools/compress");
  await expect(page).toHaveURL(/\/compress-pdf$/);
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).start_url).toBe("/");
  expect((await request.get("/sw.js")).ok()).toBe(true);
  expect((await request.get("/icon.svg")).ok()).toBe(true);

  const missing = await page.goto("/definitely-not-a-tool");
  expect(missing?.status()).toBe(404);
});

for (const tool of TOOLS) {
  test(`${tool.slug} renders without browser errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
    });
    const response = await page.goto(`/${tool.slug}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { name: tool.title })).toBeVisible();
    await expect(page.locator(`[data-testid=${tool.slug}-panel], [data-testid$=-panel]`).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
