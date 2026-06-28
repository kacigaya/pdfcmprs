import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";

export async function mergePdfs(files: File[]) {
  if (files.length < 2) {
    throw new Error("At least two PDF files are required to merge.");
  }
  const out = await PDFDocument.create();
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const src = await PDFDocument.load(buffer, { updateMetadata: false });
    const indices = src.getPageIndices();
    const pages = await out.copyPages(src, indices);
    for (const page of pages) out.addPage(page);
  }
  const bytes = await out.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return {
    blob: bytesToPdfBlob(bytes),
    filename: "merged.pdf",
    pageCount: out.getPageCount(),
  };
}
