import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { PAGE_SIZES } from "./pdfCore";
import type { PdfSaveResult } from "./pdfCore";

export interface TextLayoutOptions {
  pageSize: string;
  landscape: boolean;
  margin: number;
  fontSize: number;
  lineHeight: number;
  monospace: boolean;
}

export const DEFAULT_LAYOUT: TextLayoutOptions = {
  pageSize: "a4",
  landscape: false,
  margin: 56,
  fontSize: 11,
  lineHeight: 1.45,
  monospace: false,
};

/**
 * Break text into lines that fit `maxWidth`, wrapping on spaces and hard-
 * breaking words that are too long to fit on a line of their own.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const measure = (value: string) => font.widthOfTextAtSize(value, size);

  const breakLongWord = (word: string): string[] => {
    const pieces: string[] = [];
    let current = "";
    for (const character of word) {
      if (current && measure(current + character) > maxWidth) {
        pieces.push(current);
        current = character;
      } else {
        current += character;
      }
    }
    if (current) pieces.push(current);
    return pieces;
  };

  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) > maxWidth) {
        const pieces = breakLongWord(word);
        // Keep the final piece open so the next word can join it.
        lines.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1] ?? "";
      } else {
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

/** Strip the markers a minimal Markdown renderer understands. */
export function renderMarkdownToLines(markdown: string): {
  text: string;
  bold: boolean;
}[] {
  const out: { text: string; bold: boolean }[] = [];
  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
    if (heading) {
      out.push({ text: heading[2], bold: true });
      continue;
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(raw);
    if (bullet) {
      out.push({ text: `• ${bullet[1]}`, bold: false });
      continue;
    }
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(raw);
    if (numbered) {
      out.push({ text: `${numbered[1]}. ${numbered[2]}`, bold: false });
      continue;
    }
    // Inline emphasis markers carry no meaning once flattened.
    out.push({ text: raw.replace(/\*\*|__|\*|_|`/g, ""), bold: false });
  }
  return out;
}

/** Split a CSV line, honouring quoted fields and doubled quotes. */
export function parseCsvLine(line: string, delimiter = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (quoted) {
      if (character === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === delimiter) {
      fields.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  fields.push(current);
  return fields;
}

async function layoutLines(
  lines: { text: string; bold: boolean }[],
  options: TextLayoutOptions,
  title: string,
): Promise<PdfSaveResult> {
  const dimensions = PAGE_SIZES[options.pageSize] ?? PAGE_SIZES.a4;
  const [portraitWidth, portraitHeight] = dimensions;
  const width = options.landscape ? portraitHeight : portraitWidth;
  const height = options.landscape ? portraitWidth : portraitHeight;

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(
    options.monospace ? StandardFonts.Courier : StandardFonts.Helvetica,
  );
  const bold = await doc.embedFont(
    options.monospace ? StandardFonts.CourierBold : StandardFonts.HelveticaBold,
  );

  const usableWidth = width - options.margin * 2;
  const step = options.fontSize * options.lineHeight;

  let page = doc.addPage([width, height]);
  let cursor = height - options.margin;

  for (const line of lines) {
    const font = line.bold ? bold : regular;
    const wrapped = wrapText(line.text, font, options.fontSize, usableWidth);
    for (const piece of wrapped) {
      if (cursor - step < options.margin) {
        page = doc.addPage([width, height]);
        cursor = height - options.margin;
      }
      cursor -= step;
      if (piece) {
        page.drawText(piece, {
          x: options.margin,
          y: cursor,
          size: options.fontSize,
          font,
        });
      }
    }
  }

  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return {
    blob: bytesToPdfBlob(bytes),
    filename: `${title.replace(/\.[^.]+$/, "") || "document"}.pdf`,
    pageCount: doc.getPageCount(),
  };
}

export type TextSourceFormat =
  | "text"
  | "markdown"
  | "json"
  | "xml"
  | "csv"
  | "email";

/** Turn a plain-text-ish file into a paginated PDF. */
export async function textFileToPdf(
  file: File,
  format: TextSourceFormat,
  options: TextLayoutOptions,
): Promise<PdfSaveResult> {
  const raw = await file.text();
  if (!raw.trim()) throw new Error("This file is empty.");

  let lines: { text: string; bold: boolean }[];
  let layout = options;

  switch (format) {
    case "markdown":
      lines = renderMarkdownToLines(raw);
      break;
    case "json": {
      let pretty: string;
      try {
        pretty = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        throw new Error("This file is not valid JSON.");
      }
      lines = pretty.split("\n").map((text) => ({ text, bold: false }));
      layout = { ...options, monospace: true };
      break;
    }
    case "xml":
      lines = raw.split(/\r\n?|\n/).map((text) => ({ text, bold: false }));
      layout = { ...options, monospace: true };
      break;
    case "csv": {
      const rows = raw
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .filter((row) => row.length > 0)
        .map((row) => parseCsvLine(row));
      lines = rows.map((cells, index) => ({
        text: cells.join("  |  "),
        bold: index === 0,
      }));
      layout = { ...options, monospace: true };
      break;
    }
    case "email": {
      // Show the headers in bold, then the body as-is.
      const split = raw.indexOf("\n\n");
      const headers = split > 0 ? raw.slice(0, split) : "";
      const body = split > 0 ? raw.slice(split + 2) : raw;
      lines = [
        ...headers.split("\n").map((text) => ({ text, bold: true })),
        { text: "", bold: false },
        ...body.split("\n").map((text) => ({ text, bold: false })),
      ];
      break;
    }
    default:
      lines = raw.split(/\r\n?|\n/).map((text) => ({ text, bold: false }));
  }

  return layoutLines(lines, layout, file.name);
}
