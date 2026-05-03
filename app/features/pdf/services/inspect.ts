import { formatFileSize } from "../../../lib/files";
import { loadPdfDocument } from "../../../lib/pdfPreview";

interface PdfMetadataInfo {
  PDFFormatVersion?: string;
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  IsEncrypted?: boolean;
}

export interface PdfInspectionItem {
  label: string;
  value: string;
}

function formatPdfDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(
    /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/,
  );
  if (!match) return value;
  const [, year, month = "01", day = "01", hour = "00", minute = "00"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function pageSizeLabel(width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  return `${w} x ${h} pt`;
}

function pushIfPresent(
  items: PdfInspectionItem[],
  label: string,
  value: string | boolean | null | undefined,
) {
  if (value === null || value === undefined || value === "") return;
  items.push({ label, value: String(value) });
}

export async function inspectPdf(file: File) {
  const doc = await loadPdfDocument(file);
  try {
    const metadata = await doc.getMetadata();
    const info = metadata.info as PdfMetadataInfo;
    const firstPage = await doc.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    firstPage.cleanup();

    let dimensions = pageSizeLabel(firstViewport.width, firstViewport.height);
    if (doc.numPages > 1) {
      const lastPage = await doc.getPage(doc.numPages);
      const lastViewport = lastPage.getViewport({ scale: 1 });
      lastPage.cleanup();
      const lastDimensions = pageSizeLabel(lastViewport.width, lastViewport.height);
      if (lastDimensions !== dimensions) {
        dimensions = `${dimensions} first, ${lastDimensions} last`;
      }
    }

    const items: PdfInspectionItem[] = [
      { label: "File name", value: file.name },
      { label: "File size", value: formatFileSize(file.size) },
      { label: "Pages", value: String(doc.numPages) },
      { label: "Page size", value: dimensions },
    ];
    pushIfPresent(items, "PDF version", info.PDFFormatVersion);
    pushIfPresent(items, "Title", info.Title);
    pushIfPresent(items, "Author", info.Author);
    pushIfPresent(items, "Subject", info.Subject);
    pushIfPresent(items, "Keywords", info.Keywords);
    pushIfPresent(items, "Creator", info.Creator);
    pushIfPresent(items, "Producer", info.Producer);
    pushIfPresent(items, "Created", formatPdfDate(info.CreationDate));
    pushIfPresent(items, "Modified", formatPdfDate(info.ModDate));
    pushIfPresent(items, "Encrypted", info.IsEncrypted ? "Yes" : "No");

    return {
      filename: `${file.name} inspection`,
      description: `${doc.numPages} pages, ${formatFileSize(file.size)}.`,
      items,
    };
  } finally {
    await doc.destroy();
  }
}
