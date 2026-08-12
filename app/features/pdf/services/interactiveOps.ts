import pixelmatch from "pixelmatch";
import { PDFCheckBox, PDFDropdown, PDFDocument, PDFTextField, StandardFonts, rgb } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { loadPdfDocument, pixelsToBlob, renderPageToPixels } from "../../../lib/pdfPreview";
import { createStoredZip } from "../../../lib/zip";
import type { ProgressReporter } from "../types";
import { compressPdf, type CompressionLevel } from "./compress";
import { loadPdf, savePdf } from "./pdfCore";
import { rasterizeDocument } from "./advancedOps";

export interface EditorOperation {
  type: "text" | "rectangle" | "redact";
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  size?: number;
  color?: string;
}

function parseColor(value = "#000000") {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return rgb(...([1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number]));
}

export async function editPdf(file: File, operations: EditorOperation[]) {
  if (!operations.length) throw new Error("Add at least one editor operation.");
  let working = file;
  if (operations.some((operation) => operation.type === "redact")) {
    const rasterized = await rasterizeDocument(file, "high");
    working = new File([rasterized.blob], rasterized.filename, { type: "application/pdf" });
  }
  const doc = await loadPdf(working);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const operation of operations) {
    const page = doc.getPage(operation.page - 1);
    if (!page) throw new Error(`Page ${operation.page} does not exist.`);
    if (operation.type === "text") {
      page.drawText(operation.text || "Text", { x: operation.x, y: operation.y, size: operation.size || 14, font, color: parseColor(operation.color) });
    } else {
      page.drawRectangle({ x: operation.x, y: operation.y, width: operation.width || 100, height: operation.height || 30, color: operation.type === "redact" ? rgb(0, 0, 0) : parseColor(operation.color), borderWidth: operation.type === "rectangle" ? 1 : 0 });
    }
  }
  return savePdf(doc, file.name, "-edited");
}

export interface FormFieldSpec {
  type: "text" | "checkbox" | "dropdown";
  name: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  options?: string[];
}

export async function createForm(file: File, specs: FormFieldSpec[]) {
  const doc = await loadPdf(file);
  const form = doc.getForm();
  for (const spec of specs) {
    const page = doc.getPage(spec.page - 1);
    if (!page) throw new Error(`Page ${spec.page} does not exist.`);
    if (spec.type === "checkbox") {
      form.createCheckBox(spec.name).addToPage(page, { x: spec.x, y: spec.y, width: spec.width || 18, height: spec.height || 18 });
    } else if (spec.type === "dropdown") {
      const field = form.createDropdown(spec.name);
      field.addOptions(spec.options || []);
      field.addToPage(page, { x: spec.x, y: spec.y, width: spec.width || 160, height: spec.height || 24 });
    } else {
      form.createTextField(spec.name).addToPage(page, { x: spec.x, y: spec.y, width: spec.width || 180, height: spec.height || 24 });
    }
  }
  form.updateFieldAppearances();
  return savePdf(doc, file.name, "-form");
}

export async function fillForm(file: File, values: Record<string, string | boolean>) {
  const doc = await loadPdf(file);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) {
    const field = form.getField(name);
    if (field instanceof PDFCheckBox && typeof value === "boolean") value ? field.check() : field.uncheck();
    else if (field instanceof PDFTextField) field.setText(String(value));
    else if (field instanceof PDFDropdown) field.select(String(value));
  }
  form.updateFieldAppearances();
  return savePdf(doc, file.name, "-filled");
}

export async function comparePdfs(left: File, right: File, report?: ProgressReporter) {
  const a = await loadPdfDocument(left);
  const b = await loadPdfDocument(right);
  const entries: { filename: string; bytes: Uint8Array }[] = [];
  let changed = 0;
  try {
    const pages = Math.max(a.numPages, b.numPages);
    for (let page = 1; page <= pages; page += 1) {
      if (page > a.numPages || page > b.numPages) {
        changed += 1;
        continue;
      }
      const pa = await renderPageToPixels(a, page, 1.5);
      const pb = await renderPageToPixels(b, page, 1.5);
      const width = Math.max(pa.width, pb.width);
      const height = Math.max(pa.height, pb.height);
      const aa = new Uint8ClampedArray(width * height * 4).fill(255);
      const bb = new Uint8ClampedArray(width * height * 4).fill(255);
      for (let y = 0; y < pa.height; y += 1) aa.set(pa.data.subarray(y * pa.width * 4, (y + 1) * pa.width * 4), y * width * 4);
      for (let y = 0; y < pb.height; y += 1) bb.set(pb.data.subarray(y * pb.width * 4, (y + 1) * pb.width * 4), y * width * 4);
      const diff = new Uint8ClampedArray(width * height * 4);
      const pixels = pixelmatch(aa, bb, diff, width, height, { threshold: 0.1 });
      if (pixels) {
        changed += 1;
        entries.push({ filename: `page-${page}-diff.png`, bytes: new Uint8Array(await (await pixelsToBlob({ data: diff, width, height }, "image/png")).arrayBuffer()) });
      }
      report?.((page / pages) * 95);
    }
  } finally {
    await Promise.all([a.loadingTask.destroy(), b.loadingTask.destroy()]);
  }
  const summary = new TextEncoder().encode(JSON.stringify({ left: left.name, right: right.name, changedPages: changed }, null, 2));
  entries.unshift({ filename: "comparison.json", bytes: summary });
  return { blob: createStoredZip(entries), filename: "pdf-comparison.zip", changed };
}

export async function runWorkflow(file: File, steps: Array<{ tool: string; value?: string }>, report?: ProgressReporter) {
  let current = file;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    let result: { blob: Blob; filename: string };
    if (step.tool === "compress") result = await compressPdf(current, (step.value || "balanced") as CompressionLevel);
    else if (step.tool === "rasterize") result = await rasterizeDocument(current, "high");
    else throw new Error(`Unsupported workflow step: ${step.tool}`);
    current = new File([result.blob], result.filename, { type: "application/pdf" });
    report?.(((index + 1) / steps.length) * 95);
  }
  return { blob: current, filename: current.name, steps: steps.length };
}
