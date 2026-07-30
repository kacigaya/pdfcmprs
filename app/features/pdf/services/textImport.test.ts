import { beforeAll, describe, expect, test } from "bun:test";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import {
  DEFAULT_LAYOUT,
  parseCsvLine,
  renderMarkdownToLines,
  textFileToPdf,
  wrapText,
} from "./textImport";

let font: PDFFont;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

function makeFile(content: string, name: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("wrapText", () => {
  test("keeps a short line intact", () => {
    expect(wrapText("hello world", font, 12, 500)).toEqual(["hello world"]);
  });

  test("wraps on spaces when the line overflows", () => {
    const lines = wrapText("aaa bbb ccc ddd", font, 12, 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(40);
    }
  });

  test("preserves explicit newlines", () => {
    expect(wrapText("one\ntwo", font, 12, 500)).toEqual(["one", "two"]);
  });

  test("keeps blank lines as paragraph breaks", () => {
    expect(wrapText("one\n\ntwo", font, 12, 500)).toEqual(["one", "", "two"]);
  });

  test("normalises CRLF", () => {
    expect(wrapText("one\r\ntwo", font, 12, 500)).toEqual(["one", "two"]);
  });

  test("hard-breaks a word too long for one line", () => {
    const lines = wrapText("x".repeat(200), font, 12, 60);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(60);
    }
  });

  test("loses no characters when hard-breaking", () => {
    const word = "y".repeat(120);
    expect(wrapText(word, font, 12, 60).join("")).toBe(word);
  });

  test("handles an empty string", () => {
    expect(wrapText("", font, 12, 100)).toEqual([""]);
  });
});

describe("parseCsvLine", () => {
  test("splits on the delimiter", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  test("keeps delimiters inside quotes", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  test("unescapes doubled quotes", () => {
    expect(parseCsvLine('"say ""hi""",x')).toEqual(['say "hi"', "x"]);
  });

  test("preserves empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
    expect(parseCsvLine(",")).toEqual(["", ""]);
  });

  test("supports an alternate delimiter", () => {
    expect(parseCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });
});

describe("renderMarkdownToLines", () => {
  test("bolds headings and drops the hashes", () => {
    expect(renderMarkdownToLines("## Title")).toEqual([
      { text: "Title", bold: true },
    ]);
  });

  test("turns list markers into bullets", () => {
    expect(renderMarkdownToLines("- one\n* two")).toEqual([
      { text: "• one", bold: false },
      { text: "• two", bold: false },
    ]);
  });

  test("keeps numbered list markers", () => {
    expect(renderMarkdownToLines("1. first")).toEqual([
      { text: "1. first", bold: false },
    ]);
  });

  test("strips inline emphasis markers", () => {
    expect(renderMarkdownToLines("a **bold** and `code`")).toEqual([
      { text: "a bold and code", bold: false },
    ]);
  });
});

describe("textFileToPdf", () => {
  test("produces a PDF from plain text", async () => {
    const out = await textFileToPdf(
      makeFile("hello there", "notes.txt"),
      "text",
      DEFAULT_LAYOUT,
    );
    expect(out.pageCount).toBe(1);
    expect(out.filename).toBe("notes.pdf");
    expect(out.blob.type).toBe("application/pdf");
  });

  test("paginates long input across several pages", async () => {
    const many = Array.from({ length: 400 }, (_, i) => `line ${i}`).join("\n");
    const out = await textFileToPdf(
      makeFile(many, "long.txt"),
      "text",
      DEFAULT_LAYOUT,
    );
    expect(out.pageCount).toBeGreaterThan(1);
  });

  test("rejects an empty file", async () => {
    expect(
      textFileToPdf(makeFile("   ", "empty.txt"), "text", DEFAULT_LAYOUT),
    ).rejects.toThrow(/empty/i);
  });

  test("rejects malformed JSON rather than rendering junk", async () => {
    expect(
      textFileToPdf(makeFile("{nope", "data.json"), "json", DEFAULT_LAYOUT),
    ).rejects.toThrow(/not valid JSON/i);
  });

  test("pretty-prints valid JSON", async () => {
    const out = await textFileToPdf(
      makeFile('{"a":1,"b":[2,3]}', "data.json"),
      "json",
      DEFAULT_LAYOUT,
    );
    expect(out.pageCount).toBe(1);
    expect(out.filename).toBe("data.pdf");
  });

  test("renders CSV rows", async () => {
    const out = await textFileToPdf(
      makeFile("name,qty\nwidget,3\n", "sheet.csv"),
      "csv",
      DEFAULT_LAYOUT,
    );
    expect(out.pageCount).toBe(1);
  });

  test("respects landscape orientation", async () => {
    const out = await textFileToPdf(
      makeFile("x", "a.txt"),
      "text",
      { ...DEFAULT_LAYOUT, landscape: true },
    );
    const doc = await PDFDocument.load(await out.blob.arrayBuffer(), {
      updateMetadata: false,
    });
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });
});
