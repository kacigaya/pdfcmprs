import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";

export async function compressPdf(file: File) {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { updateMetadata: false });
  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 200,
  });
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
