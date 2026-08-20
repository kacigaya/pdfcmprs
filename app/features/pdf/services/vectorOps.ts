import { loadMupdf } from "../../../lib/wasm/loadEngine";
import { createStoredZip } from "../../../lib/zip";
import type { ProgressReporter } from "../types";

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "") || "document";
}

function padPage(page: number, total: number): string {
  return String(page).padStart(String(total).length, "0");
}

/**
 * Export each page as SVG with vector paths and text, not a raster trace.
 *
 * mupdf renders the page through a DocumentWriter set to the svg format, so
 * shapes stay scalable and text stays selectable.
 */
export async function pdfToSvg(
  file: File,
  report?: ProgressReporter,
): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  zipped: boolean;
  preview: string;
}> {
  const mupdf = await loadMupdf();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");

  const total = doc.countPages();
  if (total === 0) throw new Error("This PDF has no pages.");

  const entries: { filename: string; bytes: Uint8Array }[] = [];
  const decoder = new TextDecoder();
  let preview = "";

  for (let index = 0; index < total; index += 1) {
    const page = doc.loadPage(index);
    const buffer = new mupdf.Buffer();
    const writer = new mupdf.DocumentWriter(buffer, "svg", "");
    const device = writer.beginPage(page.getBounds());
    page.run(device, mupdf.Matrix.identity);
    device.close();
    writer.endPage();
    writer.close();

    const svg = buffer.asUint8Array();
    if (index === 0) preview = decoder.decode(svg.slice(0, 2000));
    entries.push({
      filename: `${baseName(file.name)}-page-${padPage(index + 1, total)}.svg`,
      bytes: svg,
    });
    report?.(((index + 1) / total) * 95);
  }

  const single = entries.length === 1;
  return {
    blob: single
      ? new Blob([entries[0].bytes as BlobPart], { type: "image/svg+xml" })
      : createStoredZip(entries),
    filename: single
      ? entries[0].filename
      : `${baseName(file.name)}-svg-pages.zip`,
    pageCount: total,
    zipped: !single,
    preview,
  };
}
