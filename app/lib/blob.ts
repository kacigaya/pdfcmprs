import { PDF_MIME } from "./files";

export function bytesToPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: PDF_MIME });
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}
