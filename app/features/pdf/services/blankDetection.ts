import { loadPdfDocument } from "../../../lib/pdfPreview";

/**
 * Fraction of non-white pixels below which a page counts as blank.
 * Scanned pages carry speckle, so the default is not zero.
 */
export const DEFAULT_BLANK_THRESHOLD = 0.002;

const SAMPLE_SCALE = 0.4;
const WHITE_CUTOFF = 245;

/** Returns the 1-based page numbers that render as (near) blank. */
export async function findBlankPages(
  file: File,
  threshold = DEFAULT_BLANK_THRESHOLD,
): Promise<number[]> {
  const doc = await loadPdfDocument(file);
  const blanks: number[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: SAMPLE_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let inked = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] < WHITE_CUTOFF ||
          data[i + 1] < WHITE_CUTOFF ||
          data[i + 2] < WHITE_CUTOFF
        ) {
          inked += 1;
        }
      }
      const coverage = inked / (canvas.width * canvas.height);
      if (coverage <= threshold) blanks.push(pageNumber);
    }
  } finally {
    await doc.destroy();
  }
  return blanks;
}
