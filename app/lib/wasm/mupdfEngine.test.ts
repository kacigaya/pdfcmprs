import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";

/**
 * Engine-level smoke test for mupdf, which backs Repair PDF.
 *
 * Imported straight from node_modules: the app loads mupdf by URL from
 * /wasm/, which needs a browser.
 */
const MUPDF_PATH = `${import.meta.dir}/../../../node_modules/mupdf/dist/mupdf.js`;

type MupdfBuffer = { asUint8Array(): Uint8Array };
type MupdfDoc = {
  countPages(): number;
  saveToBuffer(options: string): MupdfBuffer;
};

async function loadMupdf() {
  return (await import(MUPDF_PATH)) as {
    Document: {
      openDocument(data: Uint8Array, mimeType: string): MupdfDoc;
    };
  };
}

async function samplePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    doc.addPage([200, 200]).drawText(`page ${i + 1}`);
  }
  // A classic xref table makes the damage below easy to describe.
  return doc.save({ useObjectStreams: false });
}

function stripStartxref(bytes: Uint8Array): Uint8Array {
  const text = new TextDecoder("latin1").decode(bytes);
  return bytes.slice(0, text.lastIndexOf("startxref"));
}

describe("mupdf engine", () => {
  test("opens a healthy PDF and reports its page count", async () => {
    const mupdf = await loadMupdf();
    const doc = mupdf.Document.openDocument(await samplePdf(3), "application/pdf");
    expect(doc.countPages()).toBe(3);
  });

  test("reconstructs a PDF whose startxref is gone", async () => {
    const mupdf = await loadMupdf();
    const damaged = stripStartxref(await samplePdf(2));

    const doc = mupdf.Document.openDocument(damaged, "application/pdf");
    expect(doc.countPages()).toBe(2);

    const rebuilt = doc.saveToBuffer("garbage=compact").asUint8Array();
    // The rebuilt file must be readable by a strict parser again.
    const reopened = await PDFDocument.load(rebuilt, { updateMetadata: false });
    expect(reopened.getPageCount()).toBe(2);
  });

  test("the rebuilt file carries a valid trailer again", async () => {
    const mupdf = await loadMupdf();
    const damaged = stripStartxref(await samplePdf());
    const doc = mupdf.Document.openDocument(damaged, "application/pdf");
    const rebuilt = doc.saveToBuffer("garbage=compact").asUint8Array();
    expect(new TextDecoder("latin1").decode(rebuilt)).toContain("startxref");
  });
});
