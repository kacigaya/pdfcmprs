import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { loadPdfDocument, pixelsToBlob, renderPageToPixels } from "../../../lib/pdfPreview";
import { loadTesseract } from "../../../lib/wasm/loadEngine";
import type { ProgressReporter } from "../types";
import type { PdfSaveResult } from "./pdfCore";

export const OCR_LANGUAGES = [
  { label: "English", value: "eng" },
  { label: "French", value: "fra" },
  { label: "German", value: "deu" },
  { label: "Spanish", value: "spa" },
  { label: "Italian", value: "ita" },
  { label: "Portuguese", value: "por" },
  { label: "Dutch", value: "nld" },
  { label: "Russian", value: "rus" },
  { label: "Chinese (simplified)", value: "chi_sim" },
  { label: "Japanese", value: "jpn" },
  { label: "Korean", value: "kor" },
  { label: "Arabic", value: "ara" },
] as const;

/** Rendering DPI for OCR. Tesseract wants roughly 300 dpi to read reliably. */
const OCR_SCALE = 3;

export interface OcrResult extends PdfSaveResult {
  text: string;
  confidence: number;
}

/**
 * Run OCR over every page and rebuild the file as a searchable PDF.
 *
 * Tesseract emits a one-page PDF carrying the page image plus an invisible
 * text layer, so the pages are merged back into a single document here.
 *
 * Note: tesseract.js fetches its language data from a CDN on first use, so
 * this is the one tool that is not fully offline.
 */
export async function ocrPdf(
  file: File,
  language: string,
  report?: ProgressReporter,
): Promise<OcrResult> {
  const tesseract = await loadTesseract();
  const doc = await loadPdfDocument(file);

  let worker: Awaited<ReturnType<typeof tesseract.createWorker>> | undefined;
  try {
    worker = await tesseract.createWorker(language);
    const out = await PDFDocument.create();
    const texts: string[] = [];
    const confidences: number[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const pixels = await renderPageToPixels(doc, pageNumber, OCR_SCALE);
      const image = await pixelsToBlob(pixels, "image/png");

      const result = await worker.recognize(
        image,
        {},
        { pdf: true, text: true },
      );

      texts.push(result.data.text ?? "");
      if (typeof result.data.confidence === "number") {
        confidences.push(result.data.confidence);
      }

      const pdfBytes = result.data.pdf;
      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error(
          `OCR produced no output for page ${pageNumber}. The page may be blank.`,
        );
      }
      const pagePdf = await PDFDocument.load(Uint8Array.from(pdfBytes), {
        updateMetadata: false,
      });
      const copied = await out.copyPages(pagePdf, pagePdf.getPageIndices());
      for (const page of copied) out.addPage(page);

      report?.((pageNumber / doc.numPages) * 95);
    }

    const bytes = await out.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    return {
      blob: bytesToPdfBlob(bytes),
      filename: withPdfExtension(file.name, "-ocr"),
      pageCount: out.getPageCount(),
      text: texts.join("\n\n").trim(),
      confidence: confidences.length
        ? confidences.reduce((sum, value) => sum + value, 0) /
          confidences.length
        : 0,
    };
  } finally {
    await worker?.terminate();
    await doc.destroy();
  }
}
