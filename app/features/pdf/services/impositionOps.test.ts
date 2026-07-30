import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { bookletOrder, bookletPdf, nUpPdf, posterizePdf } from "./impositionOps";

async function makePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([300, 400]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], "doc.pdf", { type: "application/pdf" });
}

async function pageCountOf(blob: Blob): Promise<number> {
  const doc = await PDFDocument.load(await blob.arrayBuffer(), {
    updateMetadata: false,
  });
  return doc.getPageCount();
}

describe("bookletOrder", () => {
  test("orders an exact multiple of four for saddle stitch", () => {
    // Sheet 1 front [8,1], back [2,7]; sheet 2 front [6,3], back [4,5].
    expect(bookletOrder(8)).toEqual([8, 1, 2, 7, 6, 3, 4, 5]);
  });

  test("handles the smallest booklet", () => {
    expect(bookletOrder(4)).toEqual([4, 1, 2, 3]);
  });

  test("pads up to a multiple of four with blanks", () => {
    // 6 pages pad to 8; the two missing pages become 0.
    expect(bookletOrder(6)).toEqual([0, 1, 2, 0, 6, 3, 4, 5]);
    expect(bookletOrder(5)).toEqual([0, 1, 2, 0, 0, 3, 4, 5]);
  });

  test("always emits a multiple of four slots", () => {
    for (const count of [1, 2, 3, 4, 5, 9, 13, 26]) {
      expect(bookletOrder(count).length % 4).toBe(0);
    }
  });

  test("includes every real page exactly once", () => {
    for (const count of [4, 6, 8, 12, 17]) {
      const real = bookletOrder(count)
        .filter((page) => page !== 0)
        .sort((a, b) => a - b);
      expect(real).toEqual(
        Array.from({ length: count }, (_, index) => index + 1),
      );
    }
  });

  test("pairs each spread so the two halves sum consistently", () => {
    // In saddle stitch every printed pair sums to pageCount + 1 once padded.
    const padded = 12;
    const order = bookletOrder(padded);
    for (let i = 0; i < order.length; i += 2) {
      expect(order[i] + order[i + 1]).toBe(padded + 1);
    }
  });

  test("returns nothing for an empty document", () => {
    expect(bookletOrder(0)).toEqual([]);
  });
});

describe("bookletPdf", () => {
  test("produces one sheet per printed side", async () => {
    const out = await bookletPdf(await makePdf(8), { margin: 0, spacing: 0 });
    expect(out.sheets).toBe(4);
    expect(await pageCountOf(out.blob)).toBe(4);
  });

  test("reports how many blanks were added as padding", async () => {
    const out = await bookletPdf(await makePdf(6), { margin: 0, spacing: 0 });
    expect(out.padded).toBe(2);
  });

  test("makes each sheet twice as wide as a source page", async () => {
    const out = await bookletPdf(await makePdf(4), { margin: 0, spacing: 0 });
    const doc = await PDFDocument.load(await out.blob.arrayBuffer(), {
      updateMetadata: false,
    });
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(600, 1);
    expect(height).toBeCloseTo(400, 1);
  });

  test("rejects a single-page document", async () => {
    expect(
      bookletPdf(await makePdf(1), { margin: 0, spacing: 0 }),
    ).rejects.toThrow(/at least two pages/i);
  });
});

describe("nUpPdf", () => {
  test("combines four pages onto one sheet", async () => {
    const out = await nUpPdf(await makePdf(8), {
      columns: 2,
      rows: 2,
      margin: 0,
      spacing: 0,
      landscape: false,
    });
    expect(out.perSheet).toBe(4);
    expect(await pageCountOf(out.blob)).toBe(2);
  });

  test("adds a partial final sheet for a remainder", async () => {
    const out = await nUpPdf(await makePdf(5), {
      columns: 2,
      rows: 2,
      margin: 0,
      spacing: 0,
      landscape: false,
    });
    expect(await pageCountOf(out.blob)).toBe(2);
  });

  test("rejects a 1 x 1 grid as a no-op", async () => {
    expect(
      nUpPdf(await makePdf(4), {
        columns: 1,
        rows: 1,
        margin: 0,
        spacing: 0,
        landscape: false,
      }),
    ).rejects.toThrow(/larger than 1 x 1/i);
  });

  test("rejects margins that leave no room", async () => {
    expect(
      nUpPdf(await makePdf(4), {
        columns: 2,
        rows: 2,
        margin: 400,
        spacing: 0,
        landscape: false,
      }),
    ).rejects.toThrow(/no room/i);
  });

  test("swaps the sheet dimensions in landscape", async () => {
    const out = await nUpPdf(await makePdf(4), {
      columns: 2,
      rows: 1,
      margin: 0,
      spacing: 0,
      landscape: true,
    });
    const doc = await PDFDocument.load(await out.blob.arrayBuffer(), {
      updateMetadata: false,
    });
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(400, 1);
    expect(height).toBeCloseTo(300, 1);
  });
});

describe("posterizePdf", () => {
  test("splits every page into the requested number of tiles", async () => {
    const out = await posterizePdf(await makePdf(2), {
      columns: 2,
      rows: 3,
      overlap: 0,
    });
    expect(out.tilesPerPage).toBe(6);
    expect(await pageCountOf(out.blob)).toBe(12);
  });

  test("grows each tile by the overlap so sheets can be taped", async () => {
    const out = await posterizePdf(await makePdf(1), {
      columns: 2,
      rows: 2,
      overlap: 10,
    });
    const doc = await PDFDocument.load(await out.blob.arrayBuffer(), {
      updateMetadata: false,
    });
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(300 / 2 + 10, 1);
    expect(height).toBeCloseTo(400 / 2 + 10, 1);
  });

  test("rejects a 1 x 1 grid as a no-op", async () => {
    expect(
      posterizePdf(await makePdf(1), { columns: 1, rows: 1, overlap: 0 }),
    ).rejects.toThrow(/larger than 1 x 1/i);
  });
});
