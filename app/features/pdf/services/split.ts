import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";

export function parsePageSelection(
  input: string,
  totalPages: number,
): number[] {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error("Selection is empty. Example: 1, 3, 5-7");
  }
  const pages = new Set<number>();
  const normalized = cleaned.replace(/[–—]/g, "-");
  const parts = normalized
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 1 ||
        end < 1
      ) {
        throw new Error(`Invalid range: "${part}"`);
      }
      const [lo, hi] = start <= end ? [start, end] : [end, start];
      for (let p = lo; p <= hi; p += 1) pages.add(p);
      continue;
    }
    const single = Number.parseInt(part, 10);
    if (!Number.isFinite(single) || single < 1 || String(single) !== part) {
      throw new Error(`Invalid page reference: "${part}"`);
    }
    pages.add(single);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  for (const p of sorted) {
    if (p > totalPages) {
      throw new Error(
        `Page ${p} out of bounds (document has ${totalPages} pages).`,
      );
    }
  }
  return sorted;
}

export async function splitPdf(file: File, selection: string) {
  const buffer = await file.arrayBuffer();
  const src = await PDFDocument.load(buffer, { updateMetadata: false });
  const total = src.getPageCount();
  const pages = parsePageSelection(selection, total);
  const out = await PDFDocument.create();
  const indices = pages.map((p) => p - 1);
  const copied = await out.copyPages(src, indices);
  for (const page of copied) out.addPage(page);
  const bytes = await out.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return {
    blob: bytesToPdfBlob(bytes),
    filename: withPdfExtension(file.name, "-extract"),
    extractedPages: pages,
  };
}
