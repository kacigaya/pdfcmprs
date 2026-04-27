import { createObjectUrl, revokeObjectUrl } from "./blob";

export function triggerDownload(blob: Blob, filename: string): void {
  const url = createObjectUrl(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => revokeObjectUrl(url), 1000);
}
