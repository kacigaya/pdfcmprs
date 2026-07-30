import {
  degrees,
  rgb,
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { allPages, parsePageSelection } from "../../../lib/pages";
import { loadPdf, savePdf, type PdfSaveResult } from "./pdfCore";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const ANCHOR_OPTIONS: ReadonlyArray<{ label: string; value: Anchor }> = [
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Middle left", value: "middle-left" },
  { label: "Center", value: "center" },
  { label: "Middle right", value: "middle-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
];

export const FONT_OPTIONS = [
  { label: "Helvetica", value: StandardFonts.Helvetica },
  { label: "Helvetica Bold", value: StandardFonts.HelveticaBold },
  { label: "Times Roman", value: StandardFonts.TimesRoman },
  { label: "Times Bold", value: StandardFonts.TimesRomanBold },
  { label: "Courier", value: StandardFonts.Courier },
  { label: "Courier Bold", value: StandardFonts.CourierBold },
] as const;

export function parseHexColor(hex: string): RGB {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return rgb(0, 0, 0);
  const value = Number.parseInt(match[1], 16);
  return rgb(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  );
}

export interface Placement {
  anchor: Anchor;
  marginX: number;
  marginY: number;
  size: number;
  color: RGB;
  opacity: number;
  rotate: number;
}

/** Bottom-left coordinate for a text run at the requested anchor. */
function positionFor(
  page: PDFPage,
  font: PDFFont,
  text: string,
  placement: Placement,
): { x: number; y: number } {
  const { width, height } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, placement.size);
  const textHeight = font.heightAtSize(placement.size);
  const [vertical, horizontal] = placement.anchor.split("-");

  let x: number;
  if (horizontal === "left") x = placement.marginX;
  else if (horizontal === "right") x = width - placement.marginX - textWidth;
  else x = (width - textWidth) / 2;

  let y: number;
  if (vertical === "bottom") y = placement.marginY;
  else if (vertical === "top") y = height - placement.marginY - textHeight;
  else y = (height - textHeight) / 2;

  return { x, y };
}

interface OverlayOptions {
  selection: string;
  fontName: string;
  placement: Placement;
  /** Text for a given page; return null to skip that page. */
  textFor: (context: {
    pageNumber: number;
    /** 1-based index within the selected pages. */
    ordinal: number;
    totalPages: number;
    selectedCount: number;
  }) => string | null;
}

async function overlayText(
  file: File,
  suffix: string,
  options: OverlayOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const pages = options.selection.trim()
    ? parsePageSelection(options.selection, total)
    : allPages(total);
  const font = await doc.embedFont(options.fontName);

  let stamped = 0;
  pages.forEach((pageNumber, index) => {
    const text = options.textFor({
      pageNumber,
      ordinal: index + 1,
      totalPages: total,
      selectedCount: pages.length,
    });
    if (!text) return;
    const page = doc.getPage(pageNumber - 1);
    const { x, y } = positionFor(page, font, text, options.placement);
    page.drawText(text, {
      x,
      y,
      size: options.placement.size,
      font,
      color: options.placement.color,
      opacity: options.placement.opacity,
      rotate: degrees(options.placement.rotate),
    });
    stamped += 1;
  });

  const saved = await savePdf(doc, file.name, suffix);
  return { ...saved, stamped };
}

/** Substitute {n}, {total}, {page}, {filename} in a template. */
function fillTemplate(
  template: string,
  values: { n: number; total: number; page: number; filename: string },
): string {
  return template
    .replace(/\{n\}/g, String(values.n))
    .replace(/\{total\}/g, String(values.total))
    .replace(/\{page\}/g, String(values.page))
    .replace(/\{filename\}/g, values.filename);
}

export interface PageNumberOptions {
  selection: string;
  format: string;
  startAt: number;
  anchor: Anchor;
  fontName: string;
  size: number;
  color: string;
  marginX: number;
  marginY: number;
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  return overlayText(file, "-numbered", {
    selection: options.selection,
    fontName: options.fontName,
    placement: {
      anchor: options.anchor,
      marginX: options.marginX,
      marginY: options.marginY,
      size: options.size,
      color: parseHexColor(options.color),
      opacity: 1,
      rotate: 0,
    },
    textFor: ({ ordinal, pageNumber, selectedCount }) =>
      fillTemplate(options.format, {
        n: options.startAt + ordinal - 1,
        total: selectedCount + options.startAt - 1,
        page: pageNumber,
        filename: file.name,
      }),
  });
}

export interface BatesOptions {
  selection: string;
  prefix: string;
  suffix: string;
  startAt: number;
  digits: number;
  step: number;
  anchor: Anchor;
  fontName: string;
  size: number;
  color: string;
  marginX: number;
  marginY: number;
}

/** Bates numbering: a fixed-width, monotonically increasing legal stamp. */
export async function addBatesNumbering(
  file: File,
  options: BatesOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  return overlayText(file, "-bates", {
    selection: options.selection,
    fontName: options.fontName,
    placement: {
      anchor: options.anchor,
      marginX: options.marginX,
      marginY: options.marginY,
      size: options.size,
      color: parseHexColor(options.color),
      opacity: 1,
      rotate: 0,
    },
    textFor: ({ ordinal }) => {
      const value = options.startAt + (ordinal - 1) * options.step;
      const padded = String(value).padStart(options.digits, "0");
      return `${options.prefix}${padded}${options.suffix}`;
    },
  });
}

export interface WatermarkOptions {
  selection: string;
  text: string;
  fontName: string;
  size: number;
  color: string;
  opacity: number;
  rotate: number;
  anchor: Anchor;
}

export async function addWatermark(
  file: File,
  options: WatermarkOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  if (!options.text.trim()) {
    throw new Error("Enter the watermark text.");
  }
  return overlayText(file, "-watermarked", {
    selection: options.selection,
    fontName: options.fontName,
    placement: {
      anchor: options.anchor,
      marginX: 24,
      marginY: 24,
      size: options.size,
      color: parseHexColor(options.color),
      opacity: Math.min(1, Math.max(0.01, options.opacity)),
      rotate: options.rotate,
    },
    textFor: () => options.text,
  });
}

export interface HeaderFooterOptions {
  selection: string;
  headerText: string;
  footerText: string;
  fontName: string;
  size: number;
  color: string;
  marginX: number;
  marginY: number;
  align: "left" | "center" | "right";
}

export async function addHeaderFooter(
  file: File,
  options: HeaderFooterOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  if (!options.headerText.trim() && !options.footerText.trim()) {
    throw new Error("Enter header text, footer text, or both.");
  }

  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const pages = options.selection.trim()
    ? parsePageSelection(options.selection, total)
    : allPages(total);
  const font = await doc.embedFont(options.fontName);
  const color = parseHexColor(options.color);

  let stamped = 0;
  pages.forEach((pageNumber, index) => {
    const page = doc.getPage(pageNumber - 1);
    const values = {
      n: index + 1,
      total: pages.length,
      page: pageNumber,
      filename: file.name,
    };
    const anchorFor = (edge: "top" | "bottom"): Anchor =>
      `${edge}-${options.align === "left" ? "left" : options.align === "right" ? "right" : "center"}` as Anchor;

    for (const [template, edge] of [
      [options.headerText, "top"],
      [options.footerText, "bottom"],
    ] as const) {
      if (!template.trim()) continue;
      const text = fillTemplate(template, values);
      const placement: Placement = {
        anchor: anchorFor(edge),
        marginX: options.marginX,
        marginY: options.marginY,
        size: options.size,
        color,
        opacity: 1,
        rotate: 0,
      };
      const { x, y } = positionFor(page, font, text, placement);
      page.drawText(text, {
        x,
        y,
        size: options.size,
        font,
        color,
      });
      stamped += 1;
    }
  });

  const saved = await savePdf(doc, file.name, "-header-footer");
  return { ...saved, stamped };
}

export interface TextStampOptions extends WatermarkOptions {
  marginX: number;
  marginY: number;
}

export async function addTextStamp(
  file: File,
  options: TextStampOptions,
): Promise<PdfSaveResult & { stamped: number }> {
  if (!options.text.trim()) throw new Error("Enter the stamp text.");
  return overlayText(file, "-stamped", {
    selection: options.selection,
    fontName: options.fontName,
    placement: {
      anchor: options.anchor,
      marginX: options.marginX,
      marginY: options.marginY,
      size: options.size,
      color: parseHexColor(options.color),
      opacity: Math.min(1, Math.max(0.01, options.opacity)),
      rotate: options.rotate,
    },
    textFor: () => options.text,
  });
}

/** Exposed for the geometry/TOC tools that need the same font list. */
export async function embedStandardFont(
  doc: PDFDocument,
  fontName: string,
): Promise<PDFFont> {
  return doc.embedFont(fontName);
}
