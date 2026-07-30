import { PDFDocument } from "pdf-lib";
import {
  ensurePageContents,
  loadPdf,
  savePdf,
  type PdfSaveResult,
} from "./pdfCore";

/**
 * Saddle-stitch page order for a folded booklet.
 *
 * Sheets are printed two-up double-sided and folded down the middle, so the
 * outermost sheet carries the last and first pages together. Page count is
 * padded to a multiple of four with 0, meaning "leave blank".
 *
 * For 8 pages: [8,1, 2,7, 6,3, 4,5]
 */
export function bookletOrder(pageCount: number): number[] {
  if (pageCount <= 0) return [];
  const padded = Math.ceil(pageCount / 4) * 4;
  const order: number[] = [];
  let left = padded;
  let right = 1;
  while (right < left) {
    // Front of the sheet: high page on the left, low page on the right.
    order.push(left > pageCount ? 0 : left, right > pageCount ? 0 : right);
    right += 1;
    left -= 1;
    // Back of the sheet: the reverse pairing.
    order.push(right > pageCount ? 0 : right, left > pageCount ? 0 : left);
    right += 1;
    left -= 1;
  }
  return order;
}

export interface NUpOptions {
  columns: number;
  rows: number;
  margin: number;
  spacing: number;
  landscape: boolean;
}

/** Draw `columns * rows` source pages onto each output sheet. */
export async function nUpPdf(
  file: File,
  options: NUpOptions,
): Promise<PdfSaveResult & { perSheet: number }> {
  const { columns, rows, margin, spacing } = options;
  if (columns < 1 || rows < 1) {
    throw new Error("Columns and rows must be at least 1.");
  }
  if (columns === 1 && rows === 1) {
    throw new Error("Choose a grid larger than 1 x 1 to combine pages.");
  }

  const source = await loadPdf(file);
  ensurePageContents(source);
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(source.getPages());
  const perSheet = columns * rows;

  const first = embedded[0];
  const sheetWidth = options.landscape ? first.height : first.width;
  const sheetHeight = options.landscape ? first.width : first.height;

  const cellWidth = (sheetWidth - margin * 2 - spacing * (columns - 1)) / columns;
  const cellHeight = (sheetHeight - margin * 2 - spacing * (rows - 1)) / rows;
  if (cellWidth <= 0 || cellHeight <= 0) {
    throw new Error(
      "The margin and spacing leave no room for the pages. Reduce them.",
    );
  }

  for (let index = 0; index < embedded.length; index += perSheet) {
    const sheet = out.addPage([sheetWidth, sheetHeight]);
    const slice = embedded.slice(index, index + perSheet);
    slice.forEach((page, cell) => {
      const column = cell % columns;
      // Fill top row first, so row 0 sits at the top of the sheet.
      const row = Math.floor(cell / columns);
      const scale = Math.min(cellWidth / page.width, cellHeight / page.height);
      const width = page.width * scale;
      const height = page.height * scale;
      const cellX = margin + column * (cellWidth + spacing);
      const cellY =
        sheetHeight - margin - (row + 1) * cellHeight - row * spacing;
      sheet.drawPage(page, {
        x: cellX + (cellWidth - width) / 2,
        y: cellY + (cellHeight - height) / 2,
        width,
        height,
      });
    });
  }

  const saved = await savePdf(out, file.name, "-nup");
  return { ...saved, perSheet };
}

export interface BookletOptions {
  margin: number;
  spacing: number;
}

/** Impose pages two-up in saddle-stitch order, ready to print and fold. */
export async function bookletPdf(
  file: File,
  options: BookletOptions,
): Promise<PdfSaveResult & { sheets: number; padded: number }> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const total = source.getPageCount();
  if (total < 2) throw new Error("A booklet needs at least two pages.");

  const order = bookletOrder(total);
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(source.getPages());

  const first = embedded[0];
  // Two portrait pages side by side make a landscape sheet.
  const sheetWidth = first.width * 2;
  const sheetHeight = first.height;
  const cellWidth = (sheetWidth - options.margin * 2 - options.spacing) / 2;
  const cellHeight = sheetHeight - options.margin * 2;
  if (cellWidth <= 0 || cellHeight <= 0) {
    throw new Error("The margin leaves no room for the pages. Reduce it.");
  }

  for (let index = 0; index < order.length; index += 2) {
    const sheet = out.addPage([sheetWidth, sheetHeight]);
    [order[index], order[index + 1]].forEach((pageNumber, slot) => {
      if (!pageNumber) return; // 0 means a padded blank
      const page = embedded[pageNumber - 1];
      const scale = Math.min(cellWidth / page.width, cellHeight / page.height);
      const width = page.width * scale;
      const height = page.height * scale;
      const cellX = options.margin + slot * (cellWidth + options.spacing);
      sheet.drawPage(page, {
        x: cellX + (cellWidth - width) / 2,
        y: options.margin + (cellHeight - height) / 2,
        width,
        height,
      });
    });
  }

  const saved = await savePdf(out, file.name, "-booklet");
  return {
    ...saved,
    sheets: order.length / 2,
    padded: Math.ceil(total / 4) * 4 - total,
  };
}

export interface PosterizeOptions {
  columns: number;
  rows: number;
  overlap: number;
}

/**
 * Blow each page up across a grid of sheets for wall-poster printing.
 *
 * The overlap repeats a strip of content on adjacent tiles so the printed
 * sheets can be trimmed and taped without a visible gap.
 */
export async function posterizePdf(
  file: File,
  options: PosterizeOptions,
): Promise<PdfSaveResult & { tilesPerPage: number }> {
  const { columns, rows, overlap } = options;
  if (columns < 1 || rows < 1) {
    throw new Error("Columns and rows must be at least 1.");
  }
  if (columns === 1 && rows === 1) {
    throw new Error("Choose a grid larger than 1 x 1 to build a poster.");
  }

  const source = await loadPdf(file);
  ensurePageContents(source);
  const out = await PDFDocument.create();
  const pageCount = source.getPageCount();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const [embedded] = await out.embedPages([source.getPage(pageNumber - 1)]);
    const tileWidth = embedded.width / columns;
    const tileHeight = embedded.height / rows;

    for (let row = rows - 1; row >= 0; row -= 1) {
      for (let column = 0; column < columns; column += 1) {
        const sheet = out.addPage([
          tileWidth + overlap,
          tileHeight + overlap,
        ]);
        // Shift the whole page so this tile lands in the sheet's lower left,
        // then let the overlap reveal a strip of the neighbouring tile.
        sheet.drawPage(embedded, {
          x: -column * tileWidth,
          y: -row * tileHeight,
        });
      }
    }
  }

  return {
    ...(await savePdf(out, file.name, "-poster")),
    tilesPerPage: columns * rows,
  };
}
