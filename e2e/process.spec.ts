import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";
import { writePsd } from "ag-psd";
import { createStoredZip } from "../app/lib/zip";
import sharp from "sharp";

type Upload = { name: string; mimeType: string; buffer: Buffer };

const PDF_MIME = "application/pdf";

async function makePng(width = 96, height = 64) {
  return Buffer.from(await sharp({
    create: { width, height, channels: 4, background: { r: 220, g: 45, b: 70, alpha: 1 } },
  }).png().toBuffer());
}

async function makePdf(name = "sample.pdf", pages = 4, changed = false): Promise<Upload> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const image = await doc.embedPng(await makePng());
  doc.setTitle("Bento feature test");
  doc.setAuthor("Codex");
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage(index % 2 ? [420, 595] : [612, 792]);
    page.drawText(`Feature test page ${index + 1}${changed && index === 0 ? " changed" : ""}`, {
      x: 48, y: page.getHeight() - 64, size: 18, font, color: rgb(0.08, 0.15, 0.3),
    });
    for (const [row, left, right] of [[0, "Name", "Score"], [1, "Ada", String(90 + index)], [2, "Grace", String(95 + index)]] as const) {
      const y = page.getHeight() - 105 - row * 18;
      page.drawText(left, { x: 48, y, size: 12, font });
      page.drawText(right, { x: 190, y, size: 12, font });
    }
    if (index === 0) page.drawImage(image, { x: 48, y: 80, width: 96, height: 64 });
  }
  if (pages > 1) {
    const first = doc.context.obj({ Title: PDFString.of("Introduction"), Dest: [doc.getPage(0).ref, PDFName.of("Fit")] });
    const second = doc.context.obj({ Title: PDFString.of("Details"), Dest: [doc.getPage(1).ref, PDFName.of("Fit")] });
    const firstRef = doc.context.register(first);
    const secondRef = doc.context.register(second);
    first.set(PDFName.of("Next"), secondRef);
    second.set(PDFName.of("Prev"), firstRef);
    const outlines = doc.context.register(doc.context.obj({ Type: "Outlines", First: firstRef, Last: secondRef, Count: 2 }));
    doc.catalog.set(PDFName.of("Outlines"), outlines);
  }
  return { name, mimeType: PDF_MIME, buffer: Buffer.from(await doc.save()) };
}

async function makeBlankPdf(): Promise<Upload> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = doc.addPage([300, 300]);
  first.drawText("not blank", { x: 30, y: 250, size: 16, font });
  doc.addPage([300, 300]);
  return { name: "with-blank.pdf", mimeType: PDF_MIME, buffer: Buffer.from(await doc.save()) };
}

async function makeAnnotatedPdf(): Promise<Upload> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const annotation = doc.context.register(doc.context.obj({
    Type: "Annot",
    Subtype: "Text",
    Rect: [40, 220, 64, 244],
    Contents: PDFString.of("remove me"),
  }));
  page.node.set(PDFName.of("Annots"), doc.context.obj([annotation]));
  return { name: "annotated.pdf", mimeType: PDF_MIME, buffer: Buffer.from(await doc.save()) };
}

async function makeFormPdf(): Promise<Upload> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const field = doc.getForm().createTextField("full_name");
  field.addToPage(page, { x: 40, y: 300, width: 220, height: 28 });
  doc.getForm().updateFieldAppearances();
  return { name: "form.pdf", mimeType: PDF_MIME, buffer: Buffer.from(await doc.save()) };
}

function makeCertificate(): Upload {
  const directory = mkdtempSync(join(tmpdir(), "pdfcmprs-cert-"));
  const key = join(directory, "key.pem");
  const cert = join(directory, "cert.pem");
  const p12 = join(directory, "test.p12");
  try {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", key, "-out", cert, "-days", "1", "-nodes", "-subj", "/CN=pdfcmprs test"]);
    execFileSync("openssl", ["pkcs12", "-export", "-out", p12, "-inkey", key, "-in", cert, "-passout", "pass:testpass"]);
    return upload("test.p12", "application/x-pkcs12", readFileSync(p12));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function upload(name: string, mimeType: string, value: string | Uint8Array): Upload {
  return { name, mimeType, buffer: Buffer.from(value) };
}

async function zipUpload(name: string, mimeType: string, entries: Array<{ filename: string; text?: string; bytes?: Uint8Array }>) {
  const encoded = entries.map((entry) => ({ filename: entry.filename, bytes: entry.bytes ?? new TextEncoder().encode(entry.text ?? "") }));
  return upload(name, mimeType, new Uint8Array(await createStoredZip(encoded).arrayBuffer()));
}

async function remoteUpload(name: string, mimeType: string, url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fixture download failed: ${response.status} ${url}`);
  return upload(name, mimeType, new Uint8Array(await response.arrayBuffer()));
}

async function makeEbookUploads(png: Upload) {
  const epub = await zipUpload("book.epub", "application/epub+zip", [
    { filename: "mimetype", text: "application/epub+zip" },
    { filename: "META-INF/container.xml", text: `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { filename: "OEBPS/content.opf", text: `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Test book</dc:title><dc:language>en</dc:language><dc:identifier id="id">test</dc:identifier></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>` },
    { filename: "OEBPS/chapter.xhtml", text: `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><h1>Test book</h1><p>Local ebook conversion.</p></body></html>` },
  ]);
  const xps = await zipUpload("document.xps", "application/oxps", [
    { filename: "[Content_Types].xml", text: `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/></Types>` },
    { filename: "_rels/.rels", text: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R1" Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" Target="/FixedDocumentSequence.fdseq"/></Relationships>` },
    { filename: "FixedDocumentSequence.fdseq", text: `<FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06"><DocumentReference Source="/Documents/1/FixedDocument.fdoc"/></FixedDocumentSequence>` },
    { filename: "Documents/1/FixedDocument.fdoc", text: `<FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06"><PageContent Source="/Documents/1/Pages/1.fpage"/></FixedDocument>` },
    { filename: "Documents/1/Pages/1.fpage", text: `<FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" Width="300" Height="200"><Path Fill="#FF2882DC" Data="M 20,20 L 280,20 280,180 20,180 Z"/></FixedPage>` },
  ]);
  return {
    xps,
    epub,
    mobi: await remoteUpload("book.mobi", "application/x-mobipocket-ebook", "https://samplefile.com/samples/download/ebook/mobi/mobi_sample_file_200KB.mobi/"),
    fb2: upload("book.fb2", "application/x-fictionbook+xml", `<?xml version="1.0"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Test book</book-title><lang>en</lang></title-info></description><body><section><title><p>Test</p></title><p>Local ebook conversion.</p></section></body></FictionBook>`),
    cbz: await zipUpload("comic.cbz", "application/vnd.comicbook+zip", [{ filename: "001.png", bytes: png.buffer }]),
  };
}

async function imageUploads() {
  const source = sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 40, g: 130, b: 220, alpha: 1 } } });
  const [jpg, png, webp, tiff, heif] = await Promise.all([
    source.clone().jpeg().toBuffer(), source.clone().png().toBuffer(), source.clone().webp().toBuffer(),
    source.clone().tiff().toBuffer(), source.clone().heif({ compression: "av1" }).toBuffer(),
  ]);
  const bmp = Buffer.alloc(54 + 4 * 24 * 32);
  bmp.write("BM"); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(32, 18); bmp.writeInt32LE(24, 22);
  bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(32, 28); bmp.writeUInt32LE(bmp.length - 54, 34);
  for (let offset = 54; offset < bmp.length; offset += 4) { bmp[offset] = 220; bmp[offset + 1] = 130; bmp[offset + 2] = 40; bmp[offset + 3] = 255; }
  const psd = Buffer.from(writePsd({
    width: 2,
    height: 2,
    imageData: { width: 2, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]) },
  }, { generateThumbnail: false }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#2882dc"/><text x="4" y="28" fill="white">PDF</text></svg>`;
  return {
    jpg: upload("image.jpg", "image/jpeg", jpg), png: upload("image.png", "image/png", png),
    webp: upload("image.webp", "image/webp", webp), bmp: upload("image.bmp", "image/bmp", bmp),
    heic: upload("image.heic", "image/heic", heif), tiff: upload("image.tiff", "image/tiff", tiff),
    psd: upload("image.psd", "image/vnd.adobe.photoshop", psd), svg: upload("image.svg", "image/svg+xml", svg),
  };
}

function assertMagic(filename: string, bytes: Buffer) {
  expect(bytes.length, `${filename} is empty`).toBeGreaterThan(0);
  if (/\.pdf$/i.test(filename)) {
    expect(bytes.length).toBeGreaterThan(20);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  }
  if (/\.(zip|cbz|docx|xlsx)$/i.test(filename)) expect(bytes.subarray(0, 2).toString()).toBe("PK");
  if (/\.png$/i.test(filename)) expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  if (/\.jpe?g$/i.test(filename)) expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
}

async function fill(page: Page, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const field = page.locator(`[data-testid="option-${name}"]`);
    await expect(field, `missing option ${name}`).toBeVisible();
    await field.fill(value);
  }
}

async function runTool(
  page: Page,
  testInfo: TestInfo,
  slug: string,
  files: Upload | Upload[],
  options: { fields?: Record<string, string>; selection?: string; runId?: string; download?: boolean; timeout?: number; configure?: (page: Page) => Promise<void> } = {},
) {
  await test.step(slug, async () => {
    await page.goto(`/${slug}`, { waitUntil: "domcontentloaded" });
    const inputs = Array.isArray(files) ? files : [files];
    const run = page.locator(`[data-testid="${options.runId ?? `run-${slug}`}"]`);
    await expect(run).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    await expect.poll(() => fileInput.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")))).toBe(true);
    await fileInput.setInputFiles(inputs);
    await expect(page.getByText(inputs[0].name, { exact: true }), `${slug} accepted its input`).toBeVisible();
    if (options.selection !== undefined) {
      const selection = page.locator('[data-testid="page-selection-input"], [data-testid="split-selection-input"]');
      await selection.fill(options.selection);
    }
    if (options.fields) await fill(page, options.fields);
    await options.configure?.(page);
    await expect(run).toBeEnabled();
    await run.click();
    const card = page.locator('[data-testid="result-card"]');
    await expect(card.getByText(/^(Ready|Error)$/), slug).toBeVisible({ timeout: options.timeout ?? 120_000 });
    const state = (await card.getByText(/^(Ready|Error)$/).textContent())?.trim();
    if (state === "Error") throw new Error(`${slug}: ${(await card.locator('[data-testid="status-message"]').textContent())?.trim()}`);
  });
  if (options.download === false) return null;
  const button = page.locator('[data-testid="download-button"]');
  await expect(button, `${slug} should offer a download`).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  assertMagic(download.suggestedFilename(), bytes);
  await testInfo.attach(`${slug}-${download.suggestedFilename()}`, { body: bytes, contentType: "application/octet-stream" });
  return upload(download.suggestedFilename(), download.suggestedFilename().endsWith(".pdf") ? PDF_MIME : "application/octet-stream", bytes);
}

async function choose(page: Page, name: string, label: string) {
  await page.locator(`[data-testid="option-${name}"]`).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test.describe("real processing", () => {
  test.describe.configure({ mode: "serial", timeout: 1_200_000 });

  test("core document, page, edit, and structure tools", async ({ page }, testInfo) => {
    const base = await makePdf();
    const other = await makePdf("other.pdf", 2, true);
    const blank = await makeBlankPdf();
    const annotated = await makeAnnotatedPdf();
    const form = await makeFormPdf();
    const text = upload("note.txt", "text/plain", "Hello local PDF\nSecond line");

    await runTool(page, testInfo, "merge-pdf", [base, other], { runId: "run-merge" });
    await runTool(page, testInfo, "split-pdf", base, { selection: "1,3-4", runId: "run-split" });
    await runTool(page, testInfo, "view-metadata", base, { runId: "run-inspect", download: false });
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
    await runTool(page, testInfo, "pdf-to-text", base, { runId: "run-extract" });

    const simplePdfRoutes = [
      "reverse-pages", "add-blank-page", "combine-to-single-page", "divide-pages", "n-up-pdf", "pdf-booklet",
      "posterize-pdf", "linearize-pdf", "remove-restrictions", "sanitize-pdf", "remove-metadata", "fix-page-size",
      "add-page-numbers", "bates-numbering", "add-watermark", "header-and-footer", "add-stamps", "change-background",
      "table-of-contents", "pdf-editor", "pdf-multi-tool", "organize-duplicate-pages", "create-pdf-forms",
      "add-page-labels", "rotate-custom-degrees", "sign-pdf",
    ];
    for (const slug of simplePdfRoutes) await runTool(page, testInfo, slug, base);
    await runTool(page, testInfo, "rotate-pdf", base, { selection: "1,3" });
    await runTool(page, testInfo, "delete-pages", base, { selection: "2" });
    await runTool(page, testInfo, "extract-pages", base, { selection: "2-3" });
    await runTool(page, testInfo, "alternate-and-mix", [base, other]);
    await runTool(page, testInfo, "pdfs-to-zip", [base, other]);
    await runTool(page, testInfo, "page-dimensions", base, { download: false });
    await runTool(page, testInfo, "crop-pdf", base, { fields: { top: "12" } });
    await runTool(page, testInfo, "remove-annotations", annotated);
    await runTool(page, testInfo, "remove-blank-pages", blank);
    await runTool(page, testInfo, "edit-metadata", base, { fields: { title: "Updated title" } });
    await runTool(page, testInfo, "flatten-pdf", form);
    await runTool(page, testInfo, "fill-pdf-forms", form);
    await runTool(page, testInfo, "compare-pdfs", [base, other]);
    await runTool(page, testInfo, "overlay-pdfs", [base, other]);
    await runTool(page, testInfo, "workflow-builder", base);
    await runTool(page, testInfo, "edit-bookmarks", base);
    await runTool(page, testInfo, "pdf-layers", base);

    const attached = await runTool(page, testInfo, "add-attachments", [base, text]);
    expect(attached).not.toBeNull();
    await runTool(page, testInfo, "extract-attachments", attached!);
    await runTool(page, testInfo, "remove-attachments", attached!);
  });

  test("text and image input converters", async ({ page }, testInfo) => {
    const images = await imageUploads();
    await runTool(page, testInfo, "image-to-pdf", [images.png, images.jpg], { runId: "run-images-to-pdf" });
    for (const [format, file] of Object.entries(images)) await runTool(page, testInfo, `${format}-to-pdf`, file, { runId: "run-images-to-pdf" });
    const textInputs: Record<string, Upload> = {
      "text-to-pdf": upload("note.txt", "text/plain", "Hello\nWorld"),
      "markdown-to-pdf": upload("note.md", "text/markdown", "# Heading\n\n- one\n- two"),
      "json-to-pdf": upload("data.json", "application/json", '{"hello":"world","items":[1,2]}'),
      "xml-to-pdf": upload("data.xml", "application/xml", "<root><item>value</item></root>"),
      "csv-to-pdf": upload("data.csv", "text/csv", "name,score\nAda,99"),
      "email-to-pdf": upload("message.eml", "message/rfc822", "From: ada@example.test\nTo: grace@example.test\nSubject: Hello\n\nMessage body"),
    };
    for (const [slug, file] of Object.entries(textInputs)) await runTool(page, testInfo, slug, file);
  });

  test("raster, data extraction, OCR, and advanced export tools", async ({ page }, testInfo) => {
    const pdf = await makePdf("raster-source.pdf", 1);
    await runTool(page, testInfo, "compress-pdf", pdf, { runId: "run-compress", timeout: 180_000 });
    const rasterRoutes = [
      "pdf-to-image", "pdf-to-png", "pdf-to-jpg", "pdf-to-webp", "pdf-to-bmp", "pdf-to-tiff", "pdf-to-cbz",
      "pdf-to-greyscale", "invert-colors", "scanner-effect", "change-text-color", "rasterize-pdf", "deskew-pdf",
    ];
    for (const slug of rasterRoutes) await runTool(page, testInfo, slug, pdf, { timeout: 180_000 });
    await runTool(page, testInfo, "adjust-colors", pdf, { fields: { brightness: "1.2" }, timeout: 180_000 });

    const exportRoutes = [
      "pdf-to-json", "pdf-to-csv", "pdf-to-excel", "extract-tables", "pdf-to-svg", "extract-images",
      "pdf-to-docx", "pdf-to-markdown", "prepare-pdf-for-ai",
    ];
    for (const slug of exportRoutes) await runTool(page, testInfo, slug, pdf, { timeout: 180_000 });
    await runTool(page, testInfo, "ocr-pdf", pdf, { timeout: 300_000 });
    await runTool(page, testInfo, "pdf-to-pdfa", pdf, { timeout: 300_000 });
    await runTool(page, testInfo, "fonts-to-outlines", pdf, { timeout: 300_000 });
  });

  test("encryption, repair, permissions, and signatures", async ({ page }, testInfo) => {
    const pdf = await makePdf("secure.pdf", 2);
    const encrypted = await runTool(page, testInfo, "encrypt-pdf", pdf, { fields: { userPassword: "openpass", ownerPassword: "ownerpass" }, timeout: 180_000 });
    expect(encrypted).not.toBeNull();
    await runTool(page, testInfo, "decrypt-pdf", encrypted!, { fields: { password: "openpass" }, timeout: 180_000 });

    const restricted = await runTool(page, testInfo, "change-permissions", pdf, { fields: { ownerPassword: "ownerpass" }, timeout: 180_000 });
    expect(restricted).not.toBeNull();
    await runTool(page, testInfo, "remove-restrictions", restricted!, { timeout: 180_000 });

    const damagedBytes = Buffer.from(pdf.buffer.toString("latin1").replace(/startxref\s+\d+/, "startxref\n0"), "latin1");
    await runTool(page, testInfo, "repair-pdf", upload("damaged.pdf", PDF_MIME, damagedBytes), { timeout: 180_000 });

    const signed = await runTool(page, testInfo, "digital-sign-pdf", [pdf, makeCertificate()], { fields: { password: "testpass" }, timeout: 180_000 });
    expect(signed).not.toBeNull();
    await runTool(page, testInfo, "validate-signatures", signed!, { timeout: 180_000 });
    await runTool(page, testInfo, "timestamp-pdf", pdf, { timeout: 300_000 });
  });

  test("alternate option, structured edit, form, bookmark, and layer branches", async ({ page }, testInfo) => {
    const pdf = await makePdf("options.pdf", 2);
    const other = await makePdf("overlay.pdf", 1, true);

    for (const label of ["Lossless rewrite", "Light", "Aggressive"]) {
      await runTool(page, testInfo, "compress-pdf", pdf, {
        runId: "run-compress",
        timeout: 180_000,
        configure: async (current) => { await choose(current, "level", label); },
      });
    }
    for (const [value, label] of [["pdfa1", "PDF/A-1b"], ["pdfa3", "PDF/A-3b"]] as const) {
      await runTool(page, testInfo, "pdf-to-pdfa", pdf, {
        timeout: 300_000,
        configure: async (current) => { await choose(current, "level", label); },
      });
    }
    await runTool(page, testInfo, "overlay-pdfs", [pdf, other], {
      configure: async (current) => { await choose(current, "position", "Under content"); },
    });
    await runTool(page, testInfo, "fix-page-size", pdf, {
      configure: async (current) => {
        await choose(current, "size", "US Letter");
        await choose(current, "mode", "Stretch to fill");
        await current.locator('[data-testid="option-landscape"]').check();
      },
    });
    await runTool(page, testInfo, "add-page-labels", pdf, {
      fields: { prefix: "APP-", start: "4" },
      configure: async (current) => { await choose(current, "style", "I, II, III"); },
    });

    const bookmarkJson = await runTool(page, testInfo, "edit-bookmarks", pdf);
    expect(bookmarkJson).not.toBeNull();
    await runTool(page, testInfo, "edit-bookmarks", pdf, { fields: { json: bookmarkJson!.buffer.toString() } });

    const layerPdf = upload("layers.pdf", PDF_MIME, readFileSync(join(process.cwd(), "node_modules/coherentpdf/testinputs/has_ocgs.pdf")));
    await runTool(page, testInfo, "pdf-layers", layerPdf, { fields: { from: "Layer 1", to: "Renamed" } });

    await runTool(page, testInfo, "pdf-editor", pdf, { fields: { operations: JSON.stringify([
      { type: "rectangle", page: 1, x: 40, y: 650, width: 120, height: 30, color: "#00aa55" },
      { type: "redact", page: 1, x: 40, y: 700, width: 160, height: 28 },
    ]) }, timeout: 180_000 });

    const form = await runTool(page, testInfo, "create-pdf-forms", pdf, { fields: { fields: JSON.stringify([
      { type: "checkbox", name: "approved", page: 1, x: 40, y: 600 },
      { type: "dropdown", name: "status", page: 1, x: 80, y: 600, options: ["Draft", "Final"] },
    ]) } });
    expect(form).not.toBeNull();
    await runTool(page, testInfo, "fill-pdf-forms", form!, { fields: { values: JSON.stringify({ approved: true, status: "Final" }) } });
    await runTool(page, testInfo, "workflow-builder", pdf, { fields: { steps: JSON.stringify([
      { tool: "compress", value: "lossless" },
      { tool: "rasterize" },
    ]) }, timeout: 240_000 });
  });

  test("office, publishing, and ebook converters", async ({ page }, testInfo) => {
    const core = "https://raw.githubusercontent.com/LibreOffice/core/master";
    const office = {
      word: await zipUpload("document.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", [
        { filename: "[Content_Types].xml", text: `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
        { filename: "_rels/.rels", text: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
        { filename: "word/document.xml", text: `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Browser office conversion test</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>` },
      ]),
      excel: await remoteUpload("sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${core}/sc/qa/unit/data/xlsx/check-boolean.xlsx`),
      powerpoint: await remoteUpload("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", `${core}/sd/qa/unit/data/pptx/hidden_group_shape.pptx`),
      odt: await remoteUpload("document.odt", "application/vnd.oasis.opendocument.text", `${core}/sw/qa/core/data/odt/pass/tdf112123.odt`),
      ods: await remoteUpload("sheet.ods", "application/vnd.oasis.opendocument.spreadsheet", `${core}/sc/qa/unit/data/ods/tdf76310.ods`),
      odp: await remoteUpload("slides.odp", "application/vnd.oasis.opendocument.presentation", `${core}/sd/qa/unit/data/odp/tdf163343.odp`),
      odg: await remoteUpload("drawing.odg", "application/vnd.oasis.opendocument.graphics", `${core}/sd/qa/unit/tiledrendering/data/dummy.odg`),
      rtf: await remoteUpload("document.rtf", "application/rtf", `${core}/sw/qa/extras/rtfexport/data/hello.rtf`),
    };
    const raw = "https://raw.githubusercontent.com/LibreOffice/core/master/writerperfect/qa/unit/data";
    const publishing = {
      pages: await remoteUpload("document.pages", "application/x-iwork-pages-sffpages", `${raw}/writer/libetonyek/pass/Pages_4.pages`),
      wpd: await remoteUpload("document.wpd", "application/vnd.wordperfect", `${raw}/writer/libwpd/pass/WP6.wpd`),
      wps: await remoteUpload("document.wps", "application/vnd.ms-works", `${raw}/writer/libwps/pass/Works_6.0.wps`),
      pub: await remoteUpload("document.pub", "application/x-mspublisher", `${raw}/draw/libmspub/pass/fdo59355-1.pub`),
      vsd: await remoteUpload("document.vsd", "application/vnd.visio", `${raw}/draw/libvisio/pass/fdo57117-1.vsd`),
    };
    const requested = process.env.E2E_DOC_FORMAT;
    if (process.arch === "arm64" && !requested) {
      testInfo.annotations.push({ type: "issue", description: "LibreOffice WASM stalls in ARM Chromium; run an office format explicitly on x64." });
    } else {
      for (const [format, file] of Object.entries({ ...office, ...publishing }).filter(([format]) => !requested || format === requested)) {
        await runTool(page, testInfo, `${format}-to-pdf`, file, { timeout: 300_000 });
      }
    }

    const images = await imageUploads();
    const ebooks = await makeEbookUploads(images.png);
    for (const [format, file] of Object.entries(ebooks).filter(([format]) => !requested || format === requested)) {
      await runTool(page, testInfo, `${format}-to-pdf`, file, { timeout: 300_000 });
    }
  });
});
