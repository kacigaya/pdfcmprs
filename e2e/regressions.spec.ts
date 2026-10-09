import { expect, test } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-compact", "false");
});

async function uploadSource(page: import("@playwright/test").Page) {
  const input = page.locator('input[type="file"]');
  await expect.poll(() => input.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")))).toBe(true);
  await input.setInputFiles(await sourcePdf());
  await expect(page.getByText("source.pdf", { exact: true })).toBeVisible();
}

async function sourcePdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  page.drawRectangle({ x: 20, y: 20, width: 60, height: 60, color: rgb(1, 0, 0) });
  page.drawRectangle({ x: 120, y: 120, width: 60, height: 60, color: rgb(0, 0, 1) });
  page.drawText("secret", { x: 24, y: 40, size: 12 });
  const field = doc.getForm().createTextField("private");
  field.setText("annotation secret");
  field.addToPage(page, { x: 25, y: 30, width: 50, height: 40 });
  return { name: "source.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) };
}

test("editor redactions remove recoverable text and pixels, then navigation clears the result", async ({ page }) => {
  const mupdf = await import("mupdf");
  await page.goto("/pdf-editor");
  await uploadSource(page);
  await page.locator('[data-testid="option-operations"]').fill(JSON.stringify([
    { type: "redact", page: 1, x: 15, y: 15, width: 70, height: 70 },
  ]));
  await page.locator('[data-testid="run-pdf-editor"]').click();
  const downloadButton = page.locator('[data-testid="download-button"]');
  await expect(downloadButton).toBeVisible({ timeout: 120_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  const bytes = readFileSync(await download.path());
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  const pdfPage = doc.loadPage(0);
  let imageCount = 0;
  let redPixels = 0;
  let bluePixels = 0;
  let exposedMaskPixels = 0;
  const device = new mupdf.Device({ fillImage(image) {
    const pixmap = image.toPixmap();
    try {
      const pixels = pixmap.getPixels();
      const channels = pixmap.getNumberOfComponents();
      for (let index = 0; index < pixels.length; index += channels) {
        if (pixels[index] > 200 && pixels[index + 1] < 50 && pixels[index + 2] < 50) redPixels += 1;
        if (pixels[index] < 50 && pixels[index + 1] < 50 && pixels[index + 2] > 200) bluePixels += 1;
        const x = (index / channels) % pixmap.getWidth();
        const y = Math.floor(index / channels / pixmap.getWidth());
        if (x > pixmap.getWidth() * 0.125 && x < pixmap.getWidth() * 0.375 &&
          y > pixmap.getHeight() * 0.625 && y < pixmap.getHeight() * 0.875 &&
          Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) > 40) exposedMaskPixels += 1;
      }
      imageCount += 1;
    } finally { pixmap.destroy(); }
  } });
  try {
    const text = pdfPage.toStructuredText("");
    try { expect(text.asText()).not.toContain("secret"); } finally { text.destroy(); }
    pdfPage.run(device, mupdf.Matrix.identity);
    device.close();
    expect(imageCount).toBe(1);
    expect(redPixels).toBe(0);
    expect(bluePixels).toBeGreaterThan(1000);
    expect(exposedMaskPixels).toBe(0);
  } finally { device.destroy(); pdfPage.destroy(); doc.destroy(); }
  await page.getByRole("link", { name: /Invert Colors/ }).first().click();
  await expect(page).toHaveURL(/\/invert-colors$/);
  await expect(downloadButton).not.toBeVisible();
});

test("invalid numeric options are rejected before generating a PDF", async ({ page }) => {
  await page.goto("/add-blank-page");
  await uploadSource(page);
  await page.locator('[data-testid="option-count"]').fill("1.5");
  await page.locator('[data-testid="run-add-blank-page"]').click();
  await expect(page.locator('[data-testid="panel-error"]')).toContainText("increments of 1");
  await expect(page.locator('[data-testid="download-button"]')).not.toBeVisible();
});

test("document and attachment pickers accept their advertised inputs", async ({ page }) => {
  await page.goto("/word-to-pdf");
  await expect(page.locator('input[type="file"]')).toHaveAttribute("accept", /\.docx/);
  await expect(page.getByRole("button", { name: /Select Documents/ })).toBeVisible();
  await page.goto("/add-attachments");
  await expect(page.locator('input[type="file"]')).toHaveAttribute("accept", "");
});

test("text extraction rejects a document without selectable text", async ({ page }) => {
  const blank = await PDFDocument.create();
  blank.addPage([200, 200]);
  await page.goto("/pdf-to-text");
  const input = page.locator('input[type="file"]');
  await expect.poll(() => input.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")))).toBe(true);
  await input.setInputFiles({ name: "blank.pdf", mimeType: "application/pdf", buffer: Buffer.from(await blank.save()) });
  await expect(page.getByText("blank.pdf", { exact: true })).toBeVisible();
  await page.locator('[data-testid="run-extract"]').click();
  await expect(page.locator('[data-testid="panel-error"]')).toContainText("No selectable text");
  await expect(page.locator('[data-testid="download-button"]')).not.toBeVisible();
});

test("cancelling an encrypted PDF password ends the text extraction run", async ({ page }) => {
  await page.goto("/encrypt-pdf");
  await uploadSource(page);
  await page.locator('[data-testid="option-userPassword"]').fill("private");
  await page.locator('[data-testid="run-encrypt-pdf"]').click();
  const button = page.locator('[data-testid="download-button"]');
  await expect(button).toBeVisible({ timeout: 120_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const buffer = readFileSync(await download.path());
  await page.goto("/pdf-to-text");
  const input = page.locator('input[type="file"]');
  await expect.poll(() => input.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")))).toBe(true);
  page.on("dialog", (dialog) => dialog.dismiss());
  await input.setInputFiles({ name: "encrypted.pdf", mimeType: "application/pdf", buffer });
  await expect(page.getByText("encrypted.pdf", { exact: true })).toBeVisible();
  await page.locator('[data-testid="run-extract"]').click();
  await expect(page.locator('[data-testid="panel-error"]')).toContainText("Password entry was cancelled");
  await expect(page.locator('[data-testid="run-extract"]')).toBeEnabled();
});

test("theme shortcut respects settings and keeps the control label synchronized", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-compact", "false");
  await expect(page.getByRole("button", { name: "Use dark theme" })).toBeVisible();
  await page.keyboard.press("d");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Keyboard shortcuts" }).click();
  await page.goto("/");
  await page.keyboard.press("d");
  await expect(page.locator("html")).toHaveClass(/dark/);
});
