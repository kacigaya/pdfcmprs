# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: process.spec.ts >> real processing >> encryption, repair, permissions, and signatures
- Location: e2e/process.spec.ts:310:7

# Error details

```
Error: timestamp-pdf

expect(locator).toBeVisible() failed

Locator: locator('[data-testid="result-card"]').getByText(/^(Ready|Error)$/)
Expected: visible
Timeout: 300000ms
Error: element(s) not found

Call log:
  - timestamp-pdf with timeout 300000ms
  - waiting for locator('[data-testid="result-card"]').getByText(/^(Ready|Error)$/)
    - waiting for "http://127.0.0.1:3100/timestamp-pdf" navigation to finish...
    - navigated to "http://127.0.0.1:3100/timestamp-pdf"

```

```yaml
- banner:
  - link "pdfcmprs":
    - /url: /
    - text: pdf
    - emphasis: cmprs
  - button "Use dark theme"
  - link "Settings":
    - /url: /settings
  - link "Source":
    - /url: https://github.com/kacigaya/pdfcmprs
- main:
  - link "All tools Secure & Optimize":
    - /url: /?category=secure#catalog
  - paragraph: Secure & Optimize
  - heading "Timestamp PDF" [level=2]
  - paragraph: Apply an RFC 3161 timestamp from a trusted authority.
  - paragraph: 1. Add files
  - button "Drop your PDF here"
  - button "Drop your PDF here Accepts PDF files. No app-enforced size limit; browser memory limits apply. Select PDFs":
    - paragraph: Drop your PDF here
    - text: Accepts PDF files. No app-enforced size limit; browser memory limits apply. Select PDFs
  - paragraph: 2. Choose options
  - text: RFC 3161 TSA URL
  - textbox "RFC 3161 TSA URL": https://rfc3161.ai.moda
  - paragraph: 3. Process
  - button "Timestamp PDF" [disabled]
  - complementary:
    - text: Output Idle
    - paragraph: Add a file and run the tool — your result appears here.
  - region "Related tools":
    - heading "Related tools" [level=2]
    - link "All Secure & Optimize tools":
      - /url: /?category=secure#catalog
    - list:
      - listitem:
        - link "Compress PDF Shrink PDFs with lossless, light, balanced, or aggressive compression.":
          - /url: /compress-pdf
      - listitem:
        - link "Encrypt PDF Lock a PDF with a password using AES-256, AES-128, or legacy RC4-40.":
          - /url: /encrypt-pdf
      - listitem:
        - link "Decrypt PDF Remove a known password so the PDF opens without one.":
          - /url: /decrypt-pdf
- contentinfo:
  - text: Processed client-side · No server upload
  - link "Source (AGPL-3.0)":
    - /url: https://github.com/kacigaya/pdfcmprs
  - text: ·
  - emphasis: pdfcmprs
  - text: · 2026
- alert
```

# Test source

```ts
  104 | }
  105 | 
  106 | async function remoteUpload(name: string, mimeType: string, url: string) {
  107 |   const response = await fetch(url);
  108 |   if (!response.ok) throw new Error(`Fixture download failed: ${response.status} ${url}`);
  109 |   return upload(name, mimeType, new Uint8Array(await response.arrayBuffer()));
  110 | }
  111 | 
  112 | async function makeEbookUploads(png: Upload) {
  113 |   const epub = await zipUpload("book.epub", "application/epub+zip", [
  114 |     { filename: "mimetype", text: "application/epub+zip" },
  115 |     { filename: "META-INF/container.xml", text: `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
  116 |     { filename: "OEBPS/content.opf", text: `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Test book</dc:title><dc:language>en</dc:language><dc:identifier id="id">test</dc:identifier></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>` },
  117 |     { filename: "OEBPS/chapter.xhtml", text: `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><h1>Test book</h1><p>Local ebook conversion.</p></body></html>` },
  118 |   ]);
  119 |   const xps = await zipUpload("document.xps", "application/oxps", [
  120 |     { filename: "[Content_Types].xml", text: `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/></Types>` },
  121 |     { filename: "_rels/.rels", text: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R1" Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" Target="/FixedDocumentSequence.fdseq"/></Relationships>` },
  122 |     { filename: "FixedDocumentSequence.fdseq", text: `<FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06"><DocumentReference Source="/Documents/1/FixedDocument.fdoc"/></FixedDocumentSequence>` },
  123 |     { filename: "Documents/1/FixedDocument.fdoc", text: `<FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06"><PageContent Source="/Documents/1/Pages/1.fpage"/></FixedDocument>` },
  124 |     { filename: "Documents/1/Pages/1.fpage", text: `<FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" Width="300" Height="200"><Path Fill="#FF2882DC" Data="M 20,20 L 280,20 280,180 20,180 Z"/></FixedPage>` },
  125 |   ]);
  126 |   return {
  127 |     xps,
  128 |     epub,
  129 |     mobi: await remoteUpload("book.mobi", "application/x-mobipocket-ebook", "https://samplefile.com/samples/download/ebook/mobi/mobi_sample_file_200KB.mobi/"),
  130 |     fb2: upload("book.fb2", "application/x-fictionbook+xml", `<?xml version="1.0"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Test book</book-title><lang>en</lang></title-info></description><body><section><title><p>Test</p></title><p>Local ebook conversion.</p></section></body></FictionBook>`),
  131 |     cbz: await zipUpload("comic.cbz", "application/vnd.comicbook+zip", [{ filename: "001.png", bytes: png.buffer }]),
  132 |   };
  133 | }
  134 | 
  135 | async function imageUploads() {
  136 |   const source = sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 40, g: 130, b: 220, alpha: 1 } } });
  137 |   const [jpg, png, webp, tiff, heif] = await Promise.all([
  138 |     source.clone().jpeg().toBuffer(), source.clone().png().toBuffer(), source.clone().webp().toBuffer(),
  139 |     source.clone().tiff().toBuffer(), source.clone().heif({ compression: "av1" }).toBuffer(),
  140 |   ]);
  141 |   const bmp = Buffer.alloc(54 + 4 * 24 * 32);
  142 |   bmp.write("BM"); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10);
  143 |   bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(32, 18); bmp.writeInt32LE(24, 22);
  144 |   bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(32, 28); bmp.writeUInt32LE(bmp.length - 54, 34);
  145 |   for (let offset = 54; offset < bmp.length; offset += 4) { bmp[offset] = 220; bmp[offset + 1] = 130; bmp[offset + 2] = 40; bmp[offset + 3] = 255; }
  146 |   const psd = Buffer.from(writePsd({
  147 |     width: 2,
  148 |     height: 2,
  149 |     imageData: { width: 2, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]) },
  150 |   }, { generateThumbnail: false }));
  151 |   const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#2882dc"/><text x="4" y="28" fill="white">PDF</text></svg>`;
  152 |   return {
  153 |     jpg: upload("image.jpg", "image/jpeg", jpg), png: upload("image.png", "image/png", png),
  154 |     webp: upload("image.webp", "image/webp", webp), bmp: upload("image.bmp", "image/bmp", bmp),
  155 |     heic: upload("image.heic", "image/heic", heif), tiff: upload("image.tiff", "image/tiff", tiff),
  156 |     psd: upload("image.psd", "image/vnd.adobe.photoshop", psd), svg: upload("image.svg", "image/svg+xml", svg),
  157 |   };
  158 | }
  159 | 
  160 | function assertMagic(filename: string, bytes: Buffer) {
  161 |   expect(bytes.length, `${filename} is empty`).toBeGreaterThan(0);
  162 |   if (/\.pdf$/i.test(filename)) {
  163 |     expect(bytes.length).toBeGreaterThan(20);
  164 |     expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  165 |   }
  166 |   if (/\.(zip|cbz|docx|xlsx)$/i.test(filename)) expect(bytes.subarray(0, 2).toString()).toBe("PK");
  167 |   if (/\.png$/i.test(filename)) expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  168 |   if (/\.jpe?g$/i.test(filename)) expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
  169 | }
  170 | 
  171 | async function fill(page: Page, values: Record<string, string>) {
  172 |   for (const [name, value] of Object.entries(values)) {
  173 |     const field = page.locator(`[data-testid="option-${name}"]`);
  174 |     await expect(field, `missing option ${name}`).toBeVisible();
  175 |     await field.fill(value);
  176 |   }
  177 | }
  178 | 
  179 | async function runTool(
  180 |   page: Page,
  181 |   testInfo: TestInfo,
  182 |   slug: string,
  183 |   files: Upload | Upload[],
  184 |   options: { fields?: Record<string, string>; selection?: string; runId?: string; download?: boolean; timeout?: number; configure?: (page: Page) => Promise<void> } = {},
  185 | ) {
  186 |   await test.step(slug, async () => {
  187 |     await page.goto(`/${slug}`, { waitUntil: "domcontentloaded" });
  188 |     const inputs = Array.isArray(files) ? files : [files];
  189 |     const run = page.locator(`[data-testid="${options.runId ?? `run-${slug}`}"]`);
  190 |     await expect(run).toBeVisible();
  191 |     const fileInput = page.locator('input[type="file"]');
  192 |     await expect.poll(() => fileInput.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")))).toBe(true);
  193 |     await fileInput.setInputFiles(inputs);
  194 |     await expect(page.getByText(inputs[0].name, { exact: true }), `${slug} accepted its input`).toBeVisible();
  195 |     if (options.selection !== undefined) {
  196 |       const selection = page.locator('[data-testid="page-selection-input"], [data-testid="split-selection-input"]');
  197 |       await selection.fill(options.selection);
  198 |     }
  199 |     if (options.fields) await fill(page, options.fields);
  200 |     await options.configure?.(page);
  201 |     await expect(run).toBeEnabled();
  202 |     await run.click();
  203 |     const card = page.locator('[data-testid="result-card"]');
> 204 |     await expect(card.getByText(/^(Ready|Error)$/), slug).toBeVisible({ timeout: options.timeout ?? 120_000 });
      |                                                           ^ Error: timestamp-pdf
  205 |     const state = (await card.getByText(/^(Ready|Error)$/).textContent())?.trim();
  206 |     if (state === "Error") throw new Error(`${slug}: ${(await card.locator('[data-testid="status-message"]').textContent())?.trim()}`);
  207 |   });
  208 |   if (options.download === false) return null;
  209 |   const button = page.locator('[data-testid="download-button"]');
  210 |   await expect(button, `${slug} should offer a download`).toBeVisible();
  211 |   const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  212 |   const stream = await download.createReadStream();
  213 |   const chunks: Buffer[] = [];
  214 |   for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  215 |   const bytes = Buffer.concat(chunks);
  216 |   assertMagic(download.suggestedFilename(), bytes);
  217 |   await testInfo.attach(`${slug}-${download.suggestedFilename()}`, { body: bytes, contentType: "application/octet-stream" });
  218 |   return upload(download.suggestedFilename(), download.suggestedFilename().endsWith(".pdf") ? PDF_MIME : "application/octet-stream", bytes);
  219 | }
  220 | 
  221 | async function choose(page: Page, name: string, label: string) {
  222 |   await page.locator(`[data-testid="option-${name}"]`).click();
  223 |   await page.getByRole("option", { name: label, exact: true }).click();
  224 | }
  225 | 
  226 | test.describe("real processing", () => {
  227 |   test.describe.configure({ mode: "serial", timeout: 1_200_000 });
  228 | 
  229 |   test("core document, page, edit, and structure tools", async ({ page }, testInfo) => {
  230 |     const base = await makePdf();
  231 |     const other = await makePdf("other.pdf", 2, true);
  232 |     const blank = await makeBlankPdf();
  233 |     const annotated = await makeAnnotatedPdf();
  234 |     const form = await makeFormPdf();
  235 |     const text = upload("note.txt", "text/plain", "Hello local PDF\nSecond line");
  236 | 
  237 |     await runTool(page, testInfo, "merge-pdf", [base, other], { runId: "run-merge" });
  238 |     await runTool(page, testInfo, "split-pdf", base, { selection: "1,3-4", runId: "run-split" });
  239 |     await runTool(page, testInfo, "view-metadata", base, { runId: "run-inspect", download: false });
  240 |     await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  241 |     await runTool(page, testInfo, "pdf-to-text", base, { runId: "run-extract" });
  242 | 
  243 |     const simplePdfRoutes = [
  244 |       "reverse-pages", "add-blank-page", "combine-to-single-page", "divide-pages", "n-up-pdf", "pdf-booklet",
  245 |       "posterize-pdf", "linearize-pdf", "remove-restrictions", "sanitize-pdf", "remove-metadata", "fix-page-size",
  246 |       "add-page-numbers", "bates-numbering", "add-watermark", "header-and-footer", "add-stamps", "change-background",
  247 |       "table-of-contents", "pdf-editor", "pdf-multi-tool", "organize-duplicate-pages", "create-pdf-forms",
  248 |       "add-page-labels", "rotate-custom-degrees", "sign-pdf",
  249 |     ];
  250 |     for (const slug of simplePdfRoutes) await runTool(page, testInfo, slug, base);
  251 |     await runTool(page, testInfo, "rotate-pdf", base, { selection: "1,3" });
  252 |     await runTool(page, testInfo, "delete-pages", base, { selection: "2" });
  253 |     await runTool(page, testInfo, "extract-pages", base, { selection: "2-3" });
  254 |     await runTool(page, testInfo, "alternate-and-mix", [base, other]);
  255 |     await runTool(page, testInfo, "pdfs-to-zip", [base, other]);
  256 |     await runTool(page, testInfo, "page-dimensions", base, { download: false });
  257 |     await runTool(page, testInfo, "crop-pdf", base, { fields: { top: "12" } });
  258 |     await runTool(page, testInfo, "remove-annotations", annotated);
  259 |     await runTool(page, testInfo, "remove-blank-pages", blank);
  260 |     await runTool(page, testInfo, "edit-metadata", base, { fields: { title: "Updated title" } });
  261 |     await runTool(page, testInfo, "flatten-pdf", form);
  262 |     await runTool(page, testInfo, "fill-pdf-forms", form);
  263 |     await runTool(page, testInfo, "compare-pdfs", [base, other]);
  264 |     await runTool(page, testInfo, "overlay-pdfs", [base, other]);
  265 |     await runTool(page, testInfo, "workflow-builder", base);
  266 |     await runTool(page, testInfo, "edit-bookmarks", base);
  267 |     await runTool(page, testInfo, "pdf-layers", base);
  268 | 
  269 |     const attached = await runTool(page, testInfo, "add-attachments", [base, text]);
  270 |     expect(attached).not.toBeNull();
  271 |     await runTool(page, testInfo, "extract-attachments", attached!);
  272 |     await runTool(page, testInfo, "remove-attachments", attached!);
  273 |   });
  274 | 
  275 |   test("text and image input converters", async ({ page }, testInfo) => {
  276 |     const images = await imageUploads();
  277 |     await runTool(page, testInfo, "image-to-pdf", [images.png, images.jpg], { runId: "run-images-to-pdf" });
  278 |     for (const [format, file] of Object.entries(images)) await runTool(page, testInfo, `${format}-to-pdf`, file, { runId: "run-images-to-pdf" });
  279 |     const textInputs: Record<string, Upload> = {
  280 |       "text-to-pdf": upload("note.txt", "text/plain", "Hello\nWorld"),
  281 |       "markdown-to-pdf": upload("note.md", "text/markdown", "# Heading\n\n- one\n- two"),
  282 |       "json-to-pdf": upload("data.json", "application/json", '{"hello":"world","items":[1,2]}'),
  283 |       "xml-to-pdf": upload("data.xml", "application/xml", "<root><item>value</item></root>"),
  284 |       "csv-to-pdf": upload("data.csv", "text/csv", "name,score\nAda,99"),
  285 |       "email-to-pdf": upload("message.eml", "message/rfc822", "From: ada@example.test\nTo: grace@example.test\nSubject: Hello\n\nMessage body"),
  286 |     };
  287 |     for (const [slug, file] of Object.entries(textInputs)) await runTool(page, testInfo, slug, file);
  288 |   });
  289 | 
  290 |   test("raster, data extraction, OCR, and advanced export tools", async ({ page }, testInfo) => {
  291 |     const pdf = await makePdf("raster-source.pdf", 1);
  292 |     await runTool(page, testInfo, "compress-pdf", pdf, { runId: "run-compress", timeout: 180_000 });
  293 |     const rasterRoutes = [
  294 |       "pdf-to-image", "pdf-to-png", "pdf-to-jpg", "pdf-to-webp", "pdf-to-bmp", "pdf-to-tiff", "pdf-to-cbz",
  295 |       "pdf-to-greyscale", "invert-colors", "scanner-effect", "change-text-color", "rasterize-pdf", "deskew-pdf",
  296 |     ];
  297 |     for (const slug of rasterRoutes) await runTool(page, testInfo, slug, pdf, { timeout: 180_000 });
  298 |     await runTool(page, testInfo, "adjust-colors", pdf, { fields: { brightness: "1.2" }, timeout: 180_000 });
  299 | 
  300 |     const exportRoutes = [
  301 |       "pdf-to-json", "pdf-to-csv", "pdf-to-excel", "extract-tables", "pdf-to-svg", "extract-images",
  302 |       "pdf-to-docx", "pdf-to-markdown", "prepare-pdf-for-ai",
  303 |     ];
  304 |     for (const slug of exportRoutes) await runTool(page, testInfo, slug, pdf, { timeout: 180_000 });
```