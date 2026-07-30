import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import {
  adjustColors,
  encodeBmp,
  encodeTiff,
  invertColors,
  toGreyscale,
} from "../../../lib/imageEncode";
import {
  loadPdfDocument,
  pixelsToBlob,
  renderPageToPixels,
  type RenderedPixels,
} from "../../../lib/pdfPreview";
import { createStoredZip } from "../../../lib/zip";
import type { ProgressReporter } from "../types";
import type { PdfSaveResult } from "./pdfCore";

export type RasterFormat = "png" | "jpg" | "webp" | "bmp" | "tiff";
export type RasterQuality = "standard" | "high" | "maximum";

const QUALITY_SCALES: Record<RasterQuality, number> = {
  standard: 1,
  high: 2.08,
  maximum: 3,
};

const MIME_BY_FORMAT: Record<RasterFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  bmp: "image/bmp",
  tiff: "image/tiff",
};

/** Pixel transform applied in place before re-encoding. */
export type PixelTransform = (pixels: RenderedPixels) => void;

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "") || "document";
}

function padPage(page: number, total: number): string {
  return String(page).padStart(String(total).length, "0");
}

async function encodePixels(
  pixels: RenderedPixels,
  format: RasterFormat,
): Promise<Uint8Array> {
  // Canvas can encode PNG, JPEG, and WebP; BMP and TIFF are written by hand.
  if (format === "bmp") {
    return encodeBmp(pixels.data, pixels.width, pixels.height);
  }
  if (format === "tiff") {
    return encodeTiff(pixels.data, pixels.width, pixels.height);
  }
  const blob = await pixelsToBlob(
    pixels,
    MIME_BY_FORMAT[format],
    format === "jpg" ? 0.9 : undefined,
  );
  // Safari and older Firefox silently fall back to PNG for WebP.
  if (format === "webp" && blob.type !== "image/webp") {
    throw new Error("This browser cannot encode WebP. Try PNG or JPG instead.");
  }
  return new Uint8Array(await blob.arrayBuffer());
}

export interface PdfToImagesOptions {
  format: RasterFormat;
  quality: RasterQuality;
  /** ".cbz" instead of ".zip" for the comic-book variant. */
  archiveExtension?: "zip" | "cbz";
  transform?: PixelTransform;
  report?: ProgressReporter;
}

export async function pdfToImages(
  file: File,
  options: PdfToImagesOptions,
): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  format: string;
  zipped: boolean;
}> {
  const { format, quality } = options;
  const archiveExtension = options.archiveExtension ?? "zip";
  const doc = await loadPdfDocument(file);
  try {
    const scale = QUALITY_SCALES[quality];
    const entries: { filename: string; bytes: Uint8Array }[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const pixels = await renderPageToPixels(doc, pageNumber, scale);
      options.transform?.(pixels);
      entries.push({
        filename: `${baseName(file.name)}-page-${padPage(pageNumber, doc.numPages)}.${format}`,
        bytes: await encodePixels(pixels, format),
      });
      options.report?.((pageNumber / doc.numPages) * 95);
    }

    // A single page downloads as the bare image; several are archived.
    const single = entries.length === 1 && archiveExtension === "zip";
    return {
      blob: single
        ? new Blob([entries[0].bytes as BlobPart], {
            type: MIME_BY_FORMAT[format],
          })
        : createStoredZip(entries),
      filename: single
        ? entries[0].filename
        : `${baseName(file.name)}-${format}-pages.${archiveExtension}`,
      pageCount: doc.numPages,
      format: format.toUpperCase(),
      zipped: !single,
    };
  } finally {
    await doc.destroy();
  }
}

/**
 * Rasterize every page, transform its pixels, and rebuild a PDF.
 *
 * This replaces text and vectors with images, so the output is no longer
 * searchable and is usually larger. It is the honest trade for colour effects
 * that have no vector equivalent, and callers surface that in the UI.
 */
export async function rasterizePdf(
  file: File,
  transform: PixelTransform,
  options: { quality: RasterQuality; suffix: string; report?: ProgressReporter },
): Promise<PdfSaveResult> {
  const doc = await loadPdfDocument(file);
  try {
    const scale = QUALITY_SCALES[options.quality];
    const out = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const pixels = await renderPageToPixels(doc, pageNumber, scale);
      transform(pixels);
      // JPEG keeps rasterized scans to a sane size; PNG would balloon them.
      const blob = await pixelsToBlob(pixels, "image/jpeg", 0.85);
      const image = await out.embedJpg(await blob.arrayBuffer());
      // Divide by scale so the page keeps its original point size.
      const page = out.addPage([pixels.width / scale, pixels.height / scale]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
      options.report?.((pageNumber / doc.numPages) * 95);
    }

    const bytes = await out.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    return {
      blob: bytesToPdfBlob(bytes),
      filename: withPdfExtension(file.name, options.suffix),
      pageCount: out.getPageCount(),
    };
  } finally {
    await doc.destroy();
  }
}

export function pdfToGreyscale(
  file: File,
  quality: RasterQuality,
  report?: ProgressReporter,
): Promise<PdfSaveResult> {
  return rasterizePdf(file, (pixels) => toGreyscale(pixels.data), {
    quality,
    suffix: "-greyscale",
    report,
  });
}

export function invertPdfColors(
  file: File,
  quality: RasterQuality,
  report?: ProgressReporter,
): Promise<PdfSaveResult> {
  return rasterizePdf(file, (pixels) => invertColors(pixels.data), {
    quality,
    suffix: "-inverted",
    report,
  });
}

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}

export function adjustPdfColors(
  file: File,
  adjustments: ColorAdjustments,
  quality: RasterQuality,
  report?: ProgressReporter,
): Promise<PdfSaveResult> {
  return rasterizePdf(file, (pixels) => adjustColors(pixels.data, adjustments), {
    quality,
    suffix: "-adjusted",
    report,
  });
}

/**
 * Make a clean digital PDF look like a photocopy: desaturated, higher
 * contrast, slightly darkened, with a little per-pixel noise.
 */
export function scannerEffect(
  file: File,
  strength: number,
  quality: RasterQuality,
  report?: ProgressReporter,
): Promise<PdfSaveResult> {
  const amount = Math.min(1, Math.max(0, strength));
  return rasterizePdf(
    file,
    (pixels) => {
      adjustColors(pixels.data, {
        brightness: 1 - 0.06 * amount,
        contrast: 1 + 0.5 * amount,
        saturation: 1 - 0.85 * amount,
      });
      const noise = 26 * amount;
      const data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        const jitter = (Math.random() - 0.5) * noise;
        data[i] = Math.min(255, Math.max(0, data[i] + jitter));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + jitter));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + jitter));
      }
    },
    { quality, suffix: "-scanned", report },
  );
}
