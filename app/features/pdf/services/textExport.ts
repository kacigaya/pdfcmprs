import { createStoredZip } from "../../../lib/zip";
import { loadPdfDocument } from "../../../lib/pdfPreview";
import type { ProgressReporter } from "../types";

export interface PositionedText {
  text: string;
  /** PDF user-space coordinates; y grows upward. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageText {
  page: number;
  width: number;
  height: number;
  items: PositionedText[];
}

/** Pull the text layer with positions, page by page. */
export async function readPositionedText(
  file: File,
  report?: ProgressReporter,
): Promise<PageText[]> {
  const doc = await loadPdfDocument(file);
  try {
    const pages: PageText[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PositionedText[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str;
        if (!text.trim()) continue;
        // transform is [a, b, c, d, e, f]; e/f carry the position.
        const transform = item.transform as number[];
        items.push({
          text,
          x: transform[4],
          y: transform[5],
          width: item.width ?? 0,
          height: item.height ?? (Math.abs(transform[3]) || 0),
        });
      }
      page.cleanup();
      pages.push({
        page: pageNumber,
        width: viewport.width,
        height: viewport.height,
        items,
      });
      report?.((pageNumber / doc.numPages) * 90);
    }
    if (pages.every((page) => page.items.length === 0)) {
      throw new Error(
        "No selectable text found. This looks like a scan — run OCR PDF first.",
      );
    }
    return pages;
  } finally {
    await doc.loadingTask.destroy();
  }
}

/**
 * Group items into visual rows.
 *
 * Items on the same printed line rarely share an exact y, so anything within
 * `tolerance` points is treated as one row. Rows come back top-to-bottom and
 * their items left-to-right.
 */
export function clusterRows(
  items: ReadonlyArray<PositionedText>,
  tolerance = 3,
): PositionedText[][] {
  if (items.length === 0) return [];
  // Sort by descending y (top of the page first), then ascending x.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: PositionedText[][] = [];
  let current: PositionedText[] = [sorted[0]];
  let anchor = sorted[0].y;

  for (const item of sorted.slice(1)) {
    if (Math.abs(item.y - anchor) <= tolerance) {
      current.push(item);
      continue;
    }
    rows.push(current.sort((a, b) => a.x - b.x));
    current = [item];
    anchor = item.y;
  }
  rows.push(current.sort((a, b) => a.x - b.x));
  return rows;
}

/**
 * Infer column boundaries from where items start across all rows.
 *
 * Text in a column shares a left edge, so clustering the x positions of every
 * item finds the columns without needing ruling lines.
 */
export function detectColumns(
  rows: ReadonlyArray<ReadonlyArray<PositionedText>>,
  tolerance = 8,
): number[] {
  const starts = rows.flatMap((row) => row.map((item) => item.x));
  if (starts.length === 0) return [];
  const sorted = [...starts].sort((a, b) => a - b);

  const columns: number[] = [sorted[0]];
  for (const x of sorted.slice(1)) {
    if (x - columns[columns.length - 1] > tolerance) columns.push(x);
  }
  return columns;
}

/** Assign each row's items to the nearest column, producing a grid. */
export function buildTable(
  items: ReadonlyArray<PositionedText>,
  options: { rowTolerance?: number; columnTolerance?: number } = {},
): string[][] {
  const rows = clusterRows(items, options.rowTolerance);
  const columns = detectColumns(rows, options.columnTolerance);
  if (columns.length === 0) return [];

  return rows.map((row) => {
    const cells = new Array<string>(columns.length).fill("");
    for (const item of row) {
      // Nearest column start at or before this item.
      let index = 0;
      for (let i = 0; i < columns.length; i += 1) {
        if (columns[i] <= item.x + (options.columnTolerance ?? 8)) index = i;
        else break;
      }
      cells[index] = cells[index] ? `${cells[index]} ${item.text}` : item.text;
    }
    return cells.map((cell) => cell.trim());
  });
}

/** Serialize a grid as RFC 4180 CSV. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (/[",\n\r]/.test(cell)) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(","),
    )
    .join("\r\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are illegal in XML 1.0 and make Excel reject the file.
    // Tab, newline and carriage return are the only ones XML 1.0 allows.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** Spreadsheet column name: 0 -> A, 25 -> Z, 26 -> AA. */
export function columnName(index: number): string {
  let name = "";
  let value = index;
  while (value >= 0) {
    name = String.fromCharCode((value % 26) + 65) + name;
    value = Math.floor(value / 26) - 1;
  }
  return name;
}

export interface SheetData {
  name: string;
  rows: string[][];
}

/**
 * Build a minimal .xlsx.
 *
 * An xlsx is a ZIP of OOXML parts. Values are written as inline strings, which
 * skips the shared-string table entirely — larger on disk, far less code, and
 * Excel, Numbers, and LibreOffice all accept it.
 */
export function buildXlsx(sheets: ReadonlyArray<SheetData>): Blob {
  const encoder = new TextEncoder();
  const entry = (filename: string, xml: string) => ({
    filename,
    bytes: encoder.encode(xml),
  });

  const sheetFiles = sheets.map((sheet, index) => {
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const cells = row
          .map((cell, columnIndex) => {
            if (!cell) return "";
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
          })
          .join("");
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join("");
    return entry(
      `xl/worksheets/sheet${index + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  });

  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");

  const sheetRels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");

  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const files = [
    entry(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`,
    ),
    entry(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    entry(
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
    ),
    entry(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}</Relationships>`,
    ),
    ...sheetFiles,
  ];

  const zip = createStoredZip(files);
  return new Blob([zip], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "") || "document";
}

export async function pdfToJson(
  file: File,
  report?: ProgressReporter,
): Promise<{ blob: Blob; filename: string; text: string; pageCount: number }> {
  const pages = await readPositionedText(file, report);
  const payload = {
    source: file.name,
    pageCount: pages.length,
    pages: pages.map((page) => ({
      page: page.page,
      width: Number(page.width.toFixed(2)),
      height: Number(page.height.toFixed(2)),
      items: page.items.map((item) => ({
        text: item.text,
        x: Number(item.x.toFixed(2)),
        y: Number(item.y.toFixed(2)),
        width: Number(item.width.toFixed(2)),
        height: Number(item.height.toFixed(2)),
      })),
    })),
  };
  const text = JSON.stringify(payload, null, 2);
  return {
    blob: new Blob([text], { type: "application/json" }),
    filename: `${baseName(file.name)}.json`,
    text,
    pageCount: pages.length,
  };
}

export async function pdfToCsv(
  file: File,
  report?: ProgressReporter,
): Promise<{
  blob: Blob;
  filename: string;
  text: string;
  rowCount: number;
  pageCount: number;
}> {
  const pages = await readPositionedText(file, report);
  const rows: string[][] = [];
  for (const page of pages) {
    const table = buildTable(page.items);
    if (pages.length > 1 && rows.length > 0) rows.push([]);
    rows.push(...table);
  }
  const text = toCsv(rows);
  return {
    blob: new Blob([text], { type: "text/csv;charset=utf-8" }),
    filename: `${baseName(file.name)}.csv`,
    text,
    rowCount: rows.length,
    pageCount: pages.length,
  };
}

export async function pdfToExcel(
  file: File,
  report?: ProgressReporter,
): Promise<{
  blob: Blob;
  filename: string;
  sheetCount: number;
  rowCount: number;
}> {
  const pages = await readPositionedText(file, report);
  const sheets = pages.map((page) => ({
    name: `Page ${page.page}`,
    rows: buildTable(page.items),
  }));
  return {
    blob: buildXlsx(sheets),
    filename: `${baseName(file.name)}.xlsx`,
    sheetCount: sheets.length,
    rowCount: sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
  };
}

export async function extractTables(
  file: File,
  report?: ProgressReporter,
): Promise<{
  blob: Blob;
  filename: string;
  text: string;
  tableCount: number;
}> {
  const pages = await readPositionedText(file, report);
  const tables = pages
    .map((page) => ({ page: page.page, rows: buildTable(page.items) }))
    // A single column is prose, not a table.
    .filter((table) => table.rows.length > 1 && table.rows[0].length > 1);

  if (tables.length === 0) {
    throw new Error(
      "No table-like layout found. The text may be a single column.",
    );
  }

  const text = tables
    .map(
      (table) =>
        `# Page ${table.page}\n${toCsv(table.rows)}`,
    )
    .join("\n\n");

  return {
    blob: new Blob([text], { type: "text/csv;charset=utf-8" }),
    filename: `${baseName(file.name)}-tables.csv`,
    text,
    tableCount: tables.length,
  };
}
