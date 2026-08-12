import { describe, expect, test } from "bun:test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  addBatesNumbering,
  addPageNumbers,
  addWatermark,
  parseHexColor,
} from "./textOverlay";

async function makePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([400, 600]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], "doc.pdf", { type: "application/pdf" });
}

/**
 * Extract the real text layer with pdf.js.
 *
 * Searching the raw bytes does not work: pdf-lib compresses content streams,
 * so a byte-level assertion silently passes whether or not the text was ever
 * drawn. Going through a PDF reader also proves the stamp is genuine
 * selectable text rather than just present somewhere in the file.
 */
async function textOf(blob: Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    standardFontDataUrl: `${import.meta.dir}/../../../../node_modules/pdfjs-dist/standard_fonts/`,
  }).promise;

  const pages: string[] = [];
  for (let page = 1; page <= doc.numPages; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(""),
    );
  }
  await doc.loadingTask.destroy();
  return pages.join("\n");
}

const BASE = {
  fontName: StandardFonts.Helvetica,
  size: 10,
  color: "#000000",
  marginX: 20,
  marginY: 20,
};

describe("parseHexColor", () => {
  test("parses six-digit hex with and without the hash", () => {
    expect(parseHexColor("#ff0000")).toEqual(rgb(1, 0, 0));
    expect(parseHexColor("00ff00")).toEqual(rgb(0, 1, 0));
  });

  test("is case-insensitive and tolerates whitespace", () => {
    expect(parseHexColor("  #FFFFFF ")).toEqual(rgb(1, 1, 1));
  });

  test("falls back to black on malformed input", () => {
    for (const bad of ["", "#fff", "nope", "#gggggg", "#1234567"]) {
      expect(parseHexColor(bad)).toEqual(rgb(0, 0, 0));
    }
  });
});

describe("addPageNumbers", () => {
  test("numbers every page when no selection is given", async () => {
    const out = await addPageNumbers(await makePdf(4), {
      ...BASE,
      selection: "",
      format: "{n}",
      startAt: 1,
      anchor: "bottom-center",
    });
    expect(out.stamped).toBe(4);
  });

  test("numbers only the selected pages", async () => {
    const out = await addPageNumbers(await makePdf(6), {
      ...BASE,
      selection: "2, 4-5",
      format: "{n}",
      startAt: 1,
      anchor: "bottom-center",
    });
    expect(out.stamped).toBe(3);
  });

  test("honours the starting value", async () => {
    const out = await addPageNumbers(await makePdf(2), {
      ...BASE,
      selection: "",
      format: "{n}",
      startAt: 7,
      anchor: "bottom-center",
    });
    // Each page carries only its number, so the whole text layer is exact.
    expect(await textOf(out.blob)).toBe("7\n8");
  });

  test("expands the {total} and {page} placeholders", async () => {
    const out = await addPageNumbers(await makePdf(3), {
      ...BASE,
      selection: "",
      format: "{n} of {total}",
      startAt: 1,
      anchor: "bottom-center",
    });
    expect(await textOf(out.blob)).toContain("1 of 3");
  });

  test("keeps the page count unchanged", async () => {
    const out = await addPageNumbers(await makePdf(5), {
      ...BASE,
      selection: "",
      format: "{n}",
      startAt: 1,
      anchor: "top-right",
    });
    expect(out.pageCount).toBe(5);
  });
});

describe("addBatesNumbering", () => {
  test("pads to the requested width", async () => {
    const out = await addBatesNumbering(await makePdf(2), {
      ...BASE,
      selection: "",
      prefix: "",
      suffix: "",
      startAt: 1,
      digits: 6,
      step: 1,
      anchor: "bottom-right",
    });
    expect(await textOf(out.blob)).toBe("000001\n000002");
  });

  test("applies prefix and suffix", async () => {
    const out = await addBatesNumbering(await makePdf(1), {
      ...BASE,
      selection: "",
      prefix: "ABC-",
      suffix: "-Z",
      startAt: 42,
      digits: 4,
      step: 1,
      anchor: "bottom-right",
    });
    expect(await textOf(out.blob)).toBe("ABC-0042-Z");
  });

  test("increments by the step, not by one", async () => {
    const out = await addBatesNumbering(await makePdf(3), {
      ...BASE,
      selection: "",
      prefix: "",
      suffix: "",
      startAt: 10,
      digits: 3,
      step: 5,
      anchor: "bottom-right",
    });
    expect(await textOf(out.blob)).toBe("010\n015\n020");
  });

  test("numbers run in document order across a sparse selection", async () => {
    const out = await addBatesNumbering(await makePdf(10), {
      ...BASE,
      selection: "3, 7",
      prefix: "",
      suffix: "",
      startAt: 1,
      digits: 3,
      step: 1,
      anchor: "bottom-right",
    });
    expect(out.stamped).toBe(2);
    const text = await textOf(out.blob);
    // Stamps land on pages 3 and 7, counted 1..2 in document order.
    expect(text.split("\n")).toEqual(["", "", "001", "", "", "", "002", "", "", ""]);
  });
});

describe("addWatermark", () => {
  test("rejects empty text", async () => {
    const file = await makePdf(1);
    expect(
      addWatermark(file, {
        selection: "",
        text: "   ",
        fontName: StandardFonts.Helvetica,
        size: 40,
        color: "#ff0000",
        opacity: 0.3,
        rotate: 45,
        anchor: "center",
      }),
    ).rejects.toThrow(/watermark text/i);
  });

  test("clamps opacity into a legal range", async () => {
    const out = await addWatermark(await makePdf(1), {
      selection: "",
      text: "DRAFT",
      fontName: StandardFonts.Helvetica,
      size: 40,
      color: "#ff0000",
      opacity: 5,
      rotate: 0,
      anchor: "center",
    });
    // An out-of-range alpha would make the page unrenderable in strict readers.
    expect(await textOf(out.blob)).toContain("DRAFT");
  });
});
