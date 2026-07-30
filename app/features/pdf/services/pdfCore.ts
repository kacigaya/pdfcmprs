import { PDFDocument, PDFName } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";

export const SAVE_OPTIONS = {
  useObjectStreams: true,
  addDefaultPage: false,
} as const;

/** Named page sizes in PDF points, portrait. */
export const PAGE_SIZES: Record<string, [number, number]> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
  tabloid: [792, 1224],
};

export async function loadPdf(file: File): Promise<PDFDocument> {
  const buffer = await file.arrayBuffer();
  try {
    return await PDFDocument.load(buffer, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/encrypt/i.test(message)) {
      throw new Error(
        "This PDF is encrypted. Remove the password with Decrypt PDF first.",
      );
    }
    throw new Error("Could not read this PDF — it may be damaged.");
  }
}

/** Load a PDF for editing, allowing pdf-lib to ignore encryption where it can. */
export async function loadPdfBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export interface PdfSaveResult {
  blob: Blob;
  filename: string;
  pageCount: number;
}

export async function savePdf(
  doc: PDFDocument,
  sourceName: string,
  suffix: string,
): Promise<PdfSaveResult> {
  const bytes = await doc.save(SAVE_OPTIONS);
  return {
    blob: bytesToPdfBlob(bytes),
    filename: withPdfExtension(sourceName, suffix),
    pageCount: doc.getPageCount(),
  };
}

/**
 * Give every page a content stream if it lacks one.
 *
 * pdf-lib's embedPages throws "Can't embed page with missing Contents" for a
 * genuinely empty page, which real documents do contain (inserted blanks,
 * some scanner output). Any tool that re-composites pages must call this first
 * or it will fail on the whole file because of one blank page.
 *
 * Returns how many pages were patched.
 */
export function ensurePageContents(doc: PDFDocument): number {
  const contents = PDFName.of("Contents");
  let patched = 0;
  for (const page of doc.getPages()) {
    if (page.node.has(contents)) continue;
    page.node.set(contents, doc.context.register(doc.context.stream("")));
    patched += 1;
  }
  return patched;
}

/** Copy the given 1-based pages from `source` into a fresh document. */
export async function copyPagesInto(
  target: PDFDocument,
  source: PDFDocument,
  pages: ReadonlyArray<number>,
): Promise<void> {
  const copied = await target.copyPages(
    source,
    pages.map((page) => page - 1),
  );
  for (const page of copied) target.addPage(page);
}
