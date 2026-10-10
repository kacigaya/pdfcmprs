import { describe, expect, test } from "bun:test";
import { ghostscriptPdfArgs, rotatedPlacement } from "./advancedOps";
import { PDFDocument, degrees, rgb, PDFDict, PDFArray, PDFName, PDFNumber } from "pdf-lib";
import * as mupdf from "mupdf";
import { rotateCustom, inspectSignatures, documentToPdf, DOCUMENT_EXTENSIONS } from "./advancedOps";
import { addPageLabels } from "./structureOps";

/** Where pdf-lib's drawPage puts point (u, v) after rotating about (x, y). */
function place(u: number, v: number, x: number, y: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return [
    x + u * Math.cos(radians) - v * Math.sin(radians),
    y + u * Math.sin(radians) + v * Math.cos(radians),
  ];
}

describe("rotatedPlacement", () => {
  test.each([5, 30, 90, -45, 180, 270])(
    "keeps every corner on the sheet at %p degrees",
    (angle) => {
      const [w, h] = [612, 792];
      const { width, height, x, y } = rotatedPlacement(w, h, angle);
      for (const [u, v] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const [px, py] = place(u, v, x, y, angle);
        expect(px).toBeGreaterThanOrEqual(-1e-6);
        expect(py).toBeGreaterThanOrEqual(-1e-6);
        expect(px).toBeLessThanOrEqual(width + 1e-6);
        expect(py).toBeLessThanOrEqual(height + 1e-6);
      }
      const [cx, cy] = place(w / 2, h / 2, x, y, angle);
      expect(cx).toBeCloseTo(width / 2);
      expect(cy).toBeCloseTo(height / 2);
    },
  );
});

describe("ghostscriptPdfArgs", () => {
  test("runs Ghostscript in SAFER mode for every conversion", () => {
    for (const mode of ["pdfa1", "pdfa2", "pdfa3", "outlines"] as const) {
      const args = ghostscriptPdfArgs(mode);
      expect(args).toContain("-dSAFER");
      expect(args).not.toContain("-dNOSAFER");
    }
  });

  test("feeds the PDF/A definition before the input only for PDF/A", () => {
    expect(ghostscriptPdfArgs("pdfa2").slice(-2)).toEqual(["pdfa.ps", "in.pdf"]);
    expect(ghostscriptPdfArgs("outlines")).not.toContain("pdfa.ps");
  });
});

for (const angle of [90, -90, 180]) {
  test(`custom rotation ${angle} keeps the whole page visible`, async () => {
    const source = await PDFDocument.create();
    source.addPage([200, 100]).drawRectangle({ x: 0, y: 0, width: 200, height: 100, color: rgb(1, 0, 0) });
    const result = await rotateCustom(new File([await source.save() as BlobPart], "source.pdf"), angle);
    const doc = mupdf.Document.openDocument(new Uint8Array(await result.blob.arrayBuffer()), "application/pdf");
    const page = doc.loadPage(0);
    const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
    try {
      const pixels = pixmap.getPixels();
      let red = 0;
      for (let index = 0; index < pixels.length; index += 3) {
        if (pixels[index] > 240 && pixels[index + 1] < 10 && pixels[index + 2] < 10) red += 1;
      }
      expect(red).toBeGreaterThanOrEqual(19_800);
    } finally { pixmap.destroy(); page.destroy(); doc.destroy(); }
  });
}

test("custom rotation supports blank pages and preserves an existing page rotation", async () => {
  const source = await PDFDocument.create();
  source.addPage([200, 100]).setRotation(degrees(90));
  const result = await rotateCustom(new File([await source.save() as BlobPart], "blank.pdf"), 180);
  const doc = await PDFDocument.load(await result.blob.arrayBuffer());
  expect(doc.getPage(0).getWidth()).toBeCloseTo(100);
  expect(doc.getPage(0).getHeight()).toBeCloseTo(200);
});

test("custom rotation preserves the visible crop and its offset", async () => {
  const source = await PDFDocument.create();
  const page = source.addPage([200, 100]);
  page.drawRectangle({ x: 50, y: 25, width: 100, height: 50, color: rgb(1, 0, 0) });
  page.setCropBox(50, 25, 100, 50);
  const result = await rotateCustom(new File([await source.save() as BlobPart], "cropped.pdf"), 90);
  const doc = mupdf.Document.openDocument(new Uint8Array(await result.blob.arrayBuffer()), "application/pdf");
  const output = doc.loadPage(0);
  const pixmap = output.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
  try {
    expect(pixmap.getWidth()).toBe(50);
    expect(pixmap.getHeight()).toBe(100);
    const pixels = pixmap.getPixels();
    let redPixels = 0;
    for (let index = 0; index < pixels.length; index += 3) {
      if (pixels[index] === 255 && pixels[index + 1] === 0 && pixels[index + 2] === 0) redPixels += 1;
    }
    expect(redPixels).toBe(5000);
  } finally { pixmap.destroy(); output.destroy(); doc.destroy(); }
});

for (const start of [1, 4]) {
  test(`page labels start at ${start}`, async () => {
    const source = await PDFDocument.create();
    source.addPage(); source.addPage();
    const result = await addPageLabels(new File([await source.save() as BlobPart], "labels.pdf"), "decimal", "APP-", start);
    const doc = await PDFDocument.load(await result.blob.arrayBuffer());
    const labels = doc.catalog.lookup(PDFName.of("PageLabels"), PDFDict).lookup(PDFName.of("Nums"), PDFArray);
    expect(labels.lookup(1, PDFDict).lookupMaybe(PDFName.of("St"), PDFNumber)?.asNumber() ?? 1).toBe(start);
  });
}

test("signature inspection rejects overlapping ranges and never claims cryptographic verification", async () => {
  const file = new File(["/ByteRange [0 100 50 40] " + " ".repeat(200)], "signed.pdf");
  const result = await inspectSignatures(file);
  const report = JSON.parse(result.text);
  expect(report.cryptographicallyVerified).toBe(false);
  expect(report.signatures[0].structurallyValid).toBe(false);
});

test("document conversion rejects unavailable formats before loading an engine", async () => {
  for (const extension of ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "odg", "rtf", "pages", "wpd", "wps", "pub", "vsd", "unknown"]) {
    expect(DOCUMENT_EXTENSIONS).not.toContain(extension);
    await expect(documentToPdf(new File(["unsupported"], `document.${extension}`))).rejects.toThrow("This document format is not supported.");
  }
});
