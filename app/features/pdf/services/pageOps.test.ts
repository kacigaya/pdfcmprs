import { describe, expect, test } from "bun:test";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { deletePages } from "./pageOps";

async function makePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    doc.addPage([300, 400]).drawText(`page ${i + 1}`);
  }
  const bytes = await doc.save();
  return new File([bytes as BlobPart], "doc.pdf", { type: "application/pdf" });
}

/** Page dictionaries present in the file, whether linked into the tree or not. */
async function pageObjectsIn(blob: Blob): Promise<number> {
  const doc = await PDFDocument.load(await blob.arrayBuffer(), {
    updateMetadata: false,
  });
  let count = 0;
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (object instanceof PDFDict && object.get(PDFName.of("Type")) === PDFName.of("Page")) {
      count += 1;
    }
  }
  return count;
}

describe("deletePages", () => {
  test("removes deleted pages from the file, not just the page tree", async () => {
    const out = await deletePages(await makePdf(3), "2");
    expect(out.pageCount).toBe(2);
    expect(await pageObjectsIn(out.blob)).toBe(2);
  });
});
