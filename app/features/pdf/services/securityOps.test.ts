import { describe, expect, test } from "bun:test";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { sanitizePdf } from "./securityOps";

/** Build a PDF carrying JavaScript, an auto-run action, and a launch annot. */
async function makeHostilePdf(): Promise<File> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const context = doc.context;

  // Catalog-level auto-run action.
  doc.catalog.set(
    PDFName.of("OpenAction"),
    context.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert(1)") }),
  );

  // Document-level JavaScript name tree.
  doc.catalog.set(
    PDFName.of("Names"),
    context.obj({
      JavaScript: context.obj({
        Names: context.obj([
          PDFString.of("evil"),
          context.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("x()") }),
        ]),
      }),
      EmbeddedFiles: context.obj({ Names: context.obj([]) }),
    }),
  );

  // Annotation with a Launch action.
  page.node.set(
    PDFName.of("Annots"),
    context.obj([
      context.obj({
        Type: PDFName.of("Annot"),
        Subtype: PDFName.of("Link"),
        Rect: context.obj([0, 0, 10, 10]),
        A: context.obj({ S: PDFName.of("Launch"), F: PDFString.of("calc.exe") }),
      }),
    ]),
  );

  const bytes = await doc.save();
  return new File([bytes as BlobPart], "hostile.pdf", {
    type: "application/pdf",
  });
}

async function reload(blob: Blob): Promise<PDFDocument> {
  return PDFDocument.load(await blob.arrayBuffer(), { updateMetadata: false });
}

describe("sanitizePdf", () => {
  test("removes the catalog OpenAction", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    const doc = await reload(out.blob);
    expect(doc.catalog.has(PDFName.of("OpenAction"))).toBe(false);
  });

  test("removes the document JavaScript name tree", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    const doc = await reload(out.blob);
    const names = doc.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    expect(names?.has(PDFName.of("JavaScript")) ?? false).toBe(false);
  });

  test("removes embedded file attachments", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    const doc = await reload(out.blob);
    const names = doc.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    expect(names?.has(PDFName.of("EmbeddedFiles")) ?? false).toBe(false);
  });

  test("strips the launch action from the annotation", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    const doc = await reload(out.blob);
    const annots = doc
      .getPage(0)
      .node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    const annot = annots?.lookup(0, PDFDict);
    expect(annot?.has(PDFName.of("A")) ?? false).toBe(false);
  });

  test("the serialized output no longer contains the payload strings", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    const text = new TextDecoder("latin1").decode(
      new Uint8Array(await out.blob.arrayBuffer()),
    );
    // Objects are deleted, not just unlinked, so nothing survives in the bytes.
    expect(text).not.toContain("app.alert");
    expect(text).not.toContain("calc.exe");
  });

  test("purges payloads held in indirect objects, not just direct ones", async () => {
    // The realistic shape: the action is an indirect object, so unlinking the
    // catalog entry leaves it orphaned but still serialized.
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const context = doc.context;
    const actionRef = context.register(
      context.obj({
        S: PDFName.of("JavaScript"),
        JS: PDFString.of("app.alert('PWNED')"),
      }),
    );
    doc.catalog.set(PDFName.of("OpenAction"), actionRef);
    const bytes = await doc.save();
    const file = new File([bytes as BlobPart], "indirect.pdf");

    const out = await sanitizePdf(file);
    // Re-save uncompressed: object streams would otherwise hide a survivor.
    const cleaned = await reload(out.blob);
    const raw = await cleaned.save({ useObjectStreams: false });
    expect(new TextDecoder("latin1").decode(raw)).not.toContain("PWNED");
  });

  test("reports what it removed", async () => {
    const out = await sanitizePdf(await makeHostilePdf());
    expect(out.report.openActions).toBeGreaterThan(0);
    expect(out.report.javascript).toBeGreaterThan(0);
    expect(out.report.launchActions).toBeGreaterThan(0);
    expect(out.report.embeddedFiles).toBeGreaterThan(0);
  });

  test("leaves a clean PDF alone and reports nothing", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const bytes = await doc.save();
    const file = new File([bytes as BlobPart], "clean.pdf");

    const out = await sanitizePdf(file);
    expect(out.report).toEqual({
      javascript: 0,
      launchActions: 0,
      embeddedFiles: 0,
      openActions: 0,
    });
  });
});
