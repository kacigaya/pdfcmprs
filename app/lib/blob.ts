import { PDF_MIME } from "./files";

export function bytesToPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: PDF_MIME });
}
