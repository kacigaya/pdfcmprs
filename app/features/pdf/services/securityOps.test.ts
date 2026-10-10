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

test("sanitize removes chained actions, form actions, and page attachment payloads", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const context = doc.context;
  const js = context.register(context.obj({ S: "JavaScript", JS: PDFString.of("CHAINED_PAYLOAD") }));
  const safeAction = context.register(context.obj({ S: "GoTo", D: [page.ref, "Fit"], Next: js }));
  const embedded = context.register(context.stream("ATTACHMENT_PAYLOAD"));
  const spec = context.register(context.obj({ Type: "Filespec", F: PDFString.of("secret.txt"), EF: { F: embedded } }));
  page.node.set(PDFName.of("Annots"), context.obj([
    { Type: "Annot", Subtype: "Link", Rect: [0, 0, 10, 10], A: safeAction },
    { Type: "Annot", Subtype: "FileAttachment", Rect: [0, 0, 10, 10], FS: spec },
  ]));
  const form = doc.getForm().createTextField("name");
  form.addToPage(page, { x: 20, y: 50, width: 100, height: 20 });
  form.acroField.dict.set(PDFName.of("AA"), context.obj({ K: context.obj({ S: "JavaScript", JS: PDFString.of("FORM_PAYLOAD") }) }));
  const output = await sanitizePdf(new File([await doc.save() as BlobPart], "active.pdf"));
  const clean = await reload(output.blob);
  const raw = new TextDecoder().decode(await clean.save({ useObjectStreams: false }));
  expect(raw).not.toContain("CHAINED_PAYLOAD");
  expect(raw).not.toContain("ATTACHMENT_PAYLOAD");
  expect(raw).not.toContain("FORM_PAYLOAD");
  expect(clean.getForm().getFields()).toHaveLength(1);
});
