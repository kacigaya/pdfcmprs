import { createStoredZip } from "../../../lib/zip";
import { loadPdfDocument, renderPageToBlob } from "../../../lib/pdfPreview";

export type PdfImageFormat = "png" | "jpg";
export type PdfImageQuality = "standard" | "high" | "maximum";

const qualityScales: Record<PdfImageQuality, number> = {
  standard: 1,
  high: 2.08,
  maximum: 3,
};

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "") || "document";
}

function padPage(page: number, total: number): string {
  return String(page).padStart(String(total).length, "0");
}

export async function pdfToImages(
  file: File,
  format: PdfImageFormat,
  quality: PdfImageQuality,
) {
  const doc = await loadPdfDocument(file);
  try {
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const scale = qualityScales[quality];
    const entries = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const blob = await renderPageToBlob(
        doc,
        pageNumber,
        scale,
        mime,
        format === "jpg" ? 0.9 : undefined,
      );
      entries.push({
        filename: `${baseName(file.name)}-page-${padPage(pageNumber, doc.numPages)}.${format}`,
        bytes: new Uint8Array(await blob.arrayBuffer()),
      });
    }
    const blob =
      entries.length === 1
        ? new Blob([entries[0].bytes], { type: mime })
        : createStoredZip(entries);
    return {
      blob,
      filename:
        entries.length === 1
          ? entries[0].filename
          : `${baseName(file.name)}-${format}-pages.zip`,
      pageCount: doc.numPages,
      format: format.toUpperCase(),
      zipped: entries.length > 1,
    };
  } finally {
    await doc.destroy();
  }
}
