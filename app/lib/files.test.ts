import { describe, expect, test } from "bun:test";
import {
  filterImageFiles,
  filterPdfFiles,
  formatFileSize,
  PDF_MIME,
  withPdfExtension,
} from "./files";

function makeFile(name: string, type = ""): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("filterPdfFiles", () => {
  test("keeps files with the PDF mime type", () => {
    const files = [makeFile("a.pdf", PDF_MIME), makeFile("b.png", "image/png")];
    expect(filterPdfFiles(files).map((f) => f.name)).toEqual(["a.pdf"]);
  });

  test("falls back to the extension when the mime type is missing", () => {
    expect(filterPdfFiles([makeFile("report.pdf")])).toHaveLength(1);
    expect(filterPdfFiles([makeFile("REPORT.PDF")])).toHaveLength(1);
  });

  test("drops non-PDF files", () => {
    expect(filterPdfFiles([makeFile("notes.txt", "text/plain")])).toHaveLength(
      0,
    );
    expect(filterPdfFiles([makeFile("pdf.txt")])).toHaveLength(0);
  });
});

describe("filterImageFiles", () => {
  test("keeps anything with an image mime type", () => {
    expect(filterImageFiles([makeFile("x.heic", "image/heic")])).toHaveLength(
      1,
    );
  });

  test("falls back to known image extensions", () => {
    const names = ["a.jpg", "b.jpeg", "c.png", "d.webp"];
    expect(filterImageFiles(names.map((n) => makeFile(n)))).toHaveLength(4);
  });

  test("drops non-images", () => {
    expect(filterImageFiles([makeFile("a.pdf", PDF_MIME)])).toHaveLength(0);
  });
});

describe("formatFileSize", () => {
  test("formats bytes without a decimal", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(999)).toBe("999 B");
  });

  test("steps up units at 1024", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  test("drops the decimal at 10 units and above", () => {
    expect(formatFileSize(1024 * 10)).toBe("10 KB");
    expect(formatFileSize(1024 * 1536)).toBe("1.5 MB");
  });

  test("clamps invalid input", () => {
    expect(formatFileSize(-5)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe("0 B");
  });

  test("caps at the largest known unit", () => {
    expect(formatFileSize(1024 ** 4)).toBe("1024 GB");
  });
});

describe("withPdfExtension", () => {
  test("inserts the suffix before the extension", () => {
    expect(withPdfExtension("report.pdf", "-compressed")).toBe(
      "report-compressed.pdf",
    );
  });

  test("is case-insensitive about the existing extension", () => {
    expect(withPdfExtension("report.PDF", "-x")).toBe("report-x.pdf");
  });

  test("adds the extension when the name has none", () => {
    expect(withPdfExtension("report", "-x")).toBe("report-x.pdf");
  });

  test("only strips a trailing .pdf", () => {
    expect(withPdfExtension("my.pdf.backup", "-x")).toBe("my.pdf.backup-x.pdf");
  });
});
