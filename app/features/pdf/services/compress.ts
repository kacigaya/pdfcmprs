import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { runGhostscript } from "../../../lib/wasm/loadEngine";

export type CompressionLevel = "lossless" | "light" | "balanced" | "aggressive";

export function ghostscriptCompressionArgs(level: Exclude<CompressionLevel, "lossless">) {
  const preset = { light: "/printer", balanced: "/ebook", aggressive: "/screen" }[level];
  return [
    "-q",
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    "-sDEVICE=pdfwrite",
    `-dPDFSETTINGS=${preset}`,
    "-dCompatibilityLevel=1.7",
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-sOutputFile=out.pdf",
    "in.pdf",
  ];
}

export async function compressPdf(file: File, level: CompressionLevel = "balanced") {
  const buffer = await file.arrayBuffer();
  const bytes = level === "lossless"
    ? await (async () => {
        const doc = await PDFDocument.load(buffer, { updateMetadata: false });
        return doc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 200 });
      })()
    : await runGhostscript(
        ghostscriptCompressionArgs(level),
        { "in.pdf": new Uint8Array(buffer) },
        "out.pdf",
      );
  const blob = bytesToPdfBlob(bytes);
  const originalSize = file.size;
  const compressedSize = blob.size;
  const ratio = originalSize > 0 ? 1 - compressedSize / originalSize : 0;
  return {
    blob,
    filename: withPdfExtension(file.name, "-compressed"),
    originalSize,
    compressedSize,
    ratio,
  };
}
