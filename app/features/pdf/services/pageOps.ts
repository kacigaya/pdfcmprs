import { degrees, PDFDocument } from "pdf-lib";
import { withPdfExtension } from "../../../lib/files";
import { allPages, parsePageSelection } from "../../../lib/pages";
import { createStoredZip } from "../../../lib/zip";
import {
  copyPagesInto,
  ensurePageContents,
  loadPdf,
  PAGE_SIZES,
  savePdf,
  type PdfSaveResult,
} from "./pdfCore";

/** Resolve a selection string, treating empty input as every page. */
function resolveSelection(selection: string, total: number): number[] {
  if (!selection.trim()) return allPages(total);
  return parsePageSelection(selection, total);
}

export async function rotatePages(
  file: File,
  selection: string,
  turn: number,
): Promise<PdfSaveResult> {
  if (turn % 90 !== 0) {
    throw new Error(
      "Page rotation must be a multiple of 90°. Use Rotate by Custom Degrees for other angles.",
    );
  }
  const doc = await loadPdf(file);
  const pages = resolveSelection(selection, doc.getPageCount());
  for (const pageNumber of pages) {
    const page = doc.getPage(pageNumber - 1);
    const current = page.getRotation().angle;
    // PDF /Rotate must stay in [0, 360).
    page.setRotation(degrees((((current + turn) % 360) + 360) % 360));
  }
  return savePdf(doc, file.name, "-rotated");
}

export async function deletePages(
  file: File,
  selection: string,
): Promise<PdfSaveResult & { removed: number }> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const remove = new Set(parsePageSelection(selection, total));
  if (remove.size >= total) {
    throw new Error("That would delete every page. Keep at least one.");
  }
  // Remove from the end so earlier indices stay valid.
  for (let pageNumber = total; pageNumber >= 1; pageNumber -= 1) {
    if (remove.has(pageNumber)) doc.removePage(pageNumber - 1);
  }
  const saved = await savePdf(doc, file.name, "-pages-removed");
  return { ...saved, removed: remove.size };
}

export async function reversePages(file: File): Promise<PdfSaveResult> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const out = await PDFDocument.create();
  const order = allPages(source.getPageCount()).reverse();
  await copyPagesInto(out, source, order);
  return savePdf(out, file.name, "-reversed");
}

export async function reorderPages(
  file: File,
  order: ReadonlyArray<number>,
): Promise<PdfSaveResult> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const total = source.getPageCount();
  if (order.length === 0) throw new Error("Page order is empty.");
  for (const page of order) {
    if (page < 1 || page > total) {
      throw new Error(`Page ${page} is out of bounds (1-${total}).`);
    }
  }
  const out = await PDFDocument.create();
  await copyPagesInto(out, source, order);
  return savePdf(out, file.name, "-reordered");
}

export async function extractPages(
  file: File,
  selection: string,
): Promise<PdfSaveResult & { pages: number[] }> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const pages = parsePageSelection(selection, source.getPageCount());
  const out = await PDFDocument.create();
  await copyPagesInto(out, source, pages);
  const saved = await savePdf(out, file.name, "-extract");
  return { ...saved, pages };
}

export type BlankPagePosition = "start" | "end" | "after" | "between-all";

export async function addBlankPages(
  file: File,
  position: BlankPagePosition,
  afterPage: number,
  count: number,
  size: string,
): Promise<PdfSaveResult & { added: number }> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  if (count < 1) throw new Error("Add at least one blank page.");

  const first = doc.getPage(0);
  const dimensions =
    size === "match"
      ? ([first.getWidth(), first.getHeight()] as [number, number])
      : PAGE_SIZES[size];
  if (!dimensions) throw new Error(`Unknown page size: ${size}`);

  const insertAt: number[] = [];
  if (position === "start") {
    insertAt.push(0);
  } else if (position === "end") {
    insertAt.push(total);
  } else if (position === "after") {
    if (afterPage < 1 || afterPage > total) {
      throw new Error(`Page ${afterPage} is out of bounds (1-${total}).`);
    }
    insertAt.push(afterPage);
  } else {
    for (let page = 1; page < total; page += 1) insertAt.push(page);
  }

  // Insert from the back so earlier positions are unaffected.
  let added = 0;
  for (const index of [...insertAt].sort((a, b) => b - a)) {
    for (let i = 0; i < count; i += 1) {
      doc.insertPage(index, dimensions);
      added += 1;
    }
  }

  const saved = await savePdf(doc, file.name, "-with-blanks");
  return { ...saved, added };
}

export async function alternateMix(
  files: File[],
  reverseSecond: boolean,
): Promise<PdfSaveResult> {
  if (files.length < 2) {
    throw new Error("Add two PDFs to alternate between.");
  }
  const [firstFile, secondFile] = files;
  const first = await loadPdf(firstFile);
  const second = await loadPdf(secondFile);

  const firstOrder = allPages(first.getPageCount());
  const secondOrder = allPages(second.getPageCount());
  if (reverseSecond) secondOrder.reverse();

  const out = await PDFDocument.create();
  const longest = Math.max(firstOrder.length, secondOrder.length);
  for (let i = 0; i < longest; i += 1) {
    if (i < firstOrder.length) {
      await copyPagesInto(out, first, [firstOrder[i]]);
    }
    if (i < secondOrder.length) {
      await copyPagesInto(out, second, [secondOrder[i]]);
    }
  }
  return savePdf(out, "alternated.pdf", "");
}

export type StackDirection = "vertical" | "horizontal";

/** Draw every page onto one tall or wide sheet. */
export async function combineToSinglePage(
  file: File,
  direction: StackDirection,
  gap: number,
): Promise<PdfSaveResult> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const total = source.getPageCount();
  if (total === 0) throw new Error("This PDF has no pages.");

  const out = await PDFDocument.create();
  const embedded = await out.embedPages(source.getPages());

  const widths = embedded.map((page) => page.width);
  const heights = embedded.map((page) => page.height);
  const totalGap = gap * Math.max(0, total - 1);

  const sheetWidth =
    direction === "vertical"
      ? Math.max(...widths)
      : widths.reduce((sum, w) => sum + w, 0) + totalGap;
  const sheetHeight =
    direction === "vertical"
      ? heights.reduce((sum, h) => sum + h, 0) + totalGap
      : Math.max(...heights);

  const page = out.addPage([sheetWidth, sheetHeight]);

  let cursor = direction === "vertical" ? sheetHeight : 0;
  embedded.forEach((embeddedPage, index) => {
    if (direction === "vertical") {
      cursor -= heights[index];
      page.drawPage(embeddedPage, {
        x: (sheetWidth - widths[index]) / 2,
        y: cursor,
      });
      cursor -= gap;
    } else {
      page.drawPage(embeddedPage, {
        x: cursor,
        y: (sheetHeight - heights[index]) / 2,
      });
      cursor += widths[index] + gap;
    }
  });

  return savePdf(out, file.name, "-single-page");
}

/** Split every page into an x-by-y grid of smaller pages via the crop box. */
export async function dividePages(
  file: File,
  columns: number,
  rows: number,
): Promise<PdfSaveResult> {
  if (columns < 1 || rows < 1) {
    throw new Error("Columns and rows must be at least 1.");
  }
  if (columns === 1 && rows === 1) {
    throw new Error("Choose more than one column or row to divide pages.");
  }

  const source = await loadPdf(file);
  ensurePageContents(source);
  const out = await PDFDocument.create();
  const pageCount = source.getPageCount();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const [embedded] = await out.embedPages([source.getPage(pageNumber - 1)]);
    const tileWidth = embedded.width / columns;
    const tileHeight = embedded.height / rows;
    // Top-to-bottom, left-to-right reading order.
    for (let row = rows - 1; row >= 0; row -= 1) {
      for (let column = 0; column < columns; column += 1) {
        const tile = out.addPage([tileWidth, tileHeight]);
        tile.drawPage(embedded, {
          x: -column * tileWidth,
          y: -row * tileHeight,
        });
      }
    }
  }

  return savePdf(out, file.name, "-divided");
}

export async function pdfsToZip(
  files: File[],
): Promise<{ blob: Blob; filename: string; count: number }> {
  if (files.length === 0) throw new Error("Add at least one PDF.");
  const entries = await Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
  return {
    blob: createStoredZip(entries),
    filename: "pdfs.zip",
    count: entries.length,
  };
}

export async function removeBlankPages(
  file: File,
  threshold: number,
): Promise<PdfSaveResult & { removed: number }> {
  const { findBlankPages } = await import("./blankDetection");
  const blanks = await findBlankPages(file, threshold);
  const source = await loadPdf(file);
  ensurePageContents(source);
  const total = source.getPageCount();
  const keep = allPages(total).filter((page) => !blanks.includes(page));
  if (keep.length === 0) {
    throw new Error("Every page looks blank — nothing would be left.");
  }
  const out = await PDFDocument.create();
  await copyPagesInto(out, source, keep);
  const saved = await savePdf(out, file.name, "-no-blanks");
  return { ...saved, removed: blanks.length };
}

export { withPdfExtension };
