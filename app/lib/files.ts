export const PDF_MIME = "application/pdf";

function isPdfFile(file: File): boolean {
  if (file.type === PDF_MIME) return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

export function filterPdfFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter(isPdfFile);
}

export function filterImageFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter((file) => {
    if (file.type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp)$/i.test(file.name);
  });
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[unit]}`;
}

export function withPdfExtension(name: string, suffix: string): string {
  const base = name.replace(/\.pdf$/i, "");
  return `${base}${suffix}.pdf`;
}
