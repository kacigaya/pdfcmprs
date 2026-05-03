import { loadPdfDocument } from "../../../lib/pdfPreview";

function joinTextItems(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === "object" && item !== null && "str" in item) {
        return String((item as { str: unknown }).str);
      }
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function extractPdfText(file: File) {
  const doc = await loadPdfDocument(file);
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = joinTextItems(content.items);
      pages.push(`Page ${pageNumber}\n${text}`);
      page.cleanup();
    }
    const text = pages.join("\n\n").trim();
    if (!text) {
      throw new Error("No selectable text found in this PDF.");
    }
    return {
      filename: file.name.replace(/\.pdf$/i, "-text.txt"),
      description: `${doc.numPages} pages extracted.`,
      text,
      blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    };
  } finally {
    await doc.destroy();
  }
}
