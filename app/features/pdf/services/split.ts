import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { parsePageSelection } from "../../../lib/pages";

export async function splitPdf(file: File, selection: string) {
  const buffer = await file.arrayBuffer();
  const src = await PDFDocument.load(buffer, { updateMetadata: false });
  const total = src.getPageCount();
  const pages = parsePageSelection(selection, total);
  const out = await PDFDocument.create();
  const indices = pages.map((p) => p - 1);
  const copied = await out.copyPages(src, indices);
  for (const page of copied) out.addPage(page);
  const bytes = await out.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return {
    blob: bytesToPdfBlob(bytes),
    filename: withPdfExtension(file.name, "-extract"),
    extractedPages: pages,
  };
}
