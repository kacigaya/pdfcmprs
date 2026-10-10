import { describe, expect, test } from "bun:test";
import { PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { readOutline, removeMetadata } from "./editOps";

async function toFile(doc: PDFDocument): Promise<File> {
  const bytes = await doc.save();
  return new File([bytes as BlobPart], "doc.pdf", { type: "application/pdf" });
}

describe("removeMetadata", () => {
  test("drops the whole Info dictionary, including dates and custom keys", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.setTitle("Quarterly plan");
    doc.setCreationDate(new Date("2020-01-01"));
    doc.context
      .lookup(doc.context.trailerInfo.Info, PDFDict)
      .set(PDFName.of("Company"), PDFHexString.fromText("Acme"));

    const out = await removeMetadata(await toFile(doc));
    const reopened = await PDFDocument.load(await out.blob.arrayBuffer(), {
      updateMetadata: false,
    });
    expect(reopened.context.trailerInfo.Info).toBeUndefined();
    // Output uses object streams, so scan parsed objects rather than bytes.
    for (const [, object] of reopened.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      expect(object.has(PDFName.of("CreationDate"))).toBe(false);
      expect(object.has(PDFName.of("Company"))).toBe(false);
    }
  });
});

describe("readOutline", () => {
  test("reads UTF-16 hex-string bookmark titles", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const second = doc.addPage();
    const item = doc.context.register(
      doc.context.obj({
        Title: PDFHexString.fromText("Résumé → 概要"),
        Dest: [second.ref, PDFName.of("Fit")],
      }),
    );
    doc.catalog.set(
      PDFName.of("Outlines"),
      doc.context.register(doc.context.obj({ Type: "Outlines", First: item, Last: item, Count: 1 })),
    );

    expect(await readOutline(await toFile(doc))).toEqual([
      { title: "Résumé → 概要", page: 2, depth: 0 },
    ]);
  });
});
