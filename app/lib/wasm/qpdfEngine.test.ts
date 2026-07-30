import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";

/**
 * Engine-level smoke test for qpdf.
 *
 * The app loads qpdf through loadEngine(), which injects a <script> tag and so
 * needs a browser. Here the Emscripten factory is required straight out of
 * node_modules instead — the point is to prove the qpdf commands the security
 * tools depend on actually work, not to exercise the browser loader.
 */
const QPDF_DIR = `${import.meta.dir}/../../../node_modules/@neslinesli93/qpdf-wasm/dist`;

type QpdfInstance = {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    stat(path: string): unknown;
  };
};

async function loadFactory() {
  const module = await import(`${QPDF_DIR}/qpdf.js`);
  return (module.default ??
    (globalThis as { Module?: unknown }).Module) as (
    options: Record<string, unknown>,
  ) => Promise<QpdfInstance>;
}

function exists(instance: QpdfInstance, path: string): boolean {
  try {
    instance.FS.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function samplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]).drawText("classified");
  return doc.save();
}

async function runQpdf(
  args: string[],
  input: Uint8Array,
): Promise<Uint8Array | null> {
  const factory = await loadFactory();
  const instance = await factory({
    noInitialRun: true,
    locateFile: () => `${QPDF_DIR}/qpdf.wasm`,
  });
  instance.FS.writeFile("in.pdf", input);
  try {
    instance.callMain([...args, "in.pdf", "out.pdf"]);
  } catch {
    // Exit status is reported through the output file's presence.
  } finally {
    // On the Node path Emscripten mirrors the tool's exit status onto
    // process.exitCode, which would fail the whole `bun test` run even when
    // every assertion passed. The browser has no process object, so this is
    // purely a test-harness concern.
    process.exitCode = 0;
  }
  return exists(instance, "out.pdf") ? instance.FS.readFile("out.pdf") : null;
}

function asText(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

describe("qpdf engine", () => {
  test("encrypts a PDF", async () => {
    const encrypted = await runQpdf(
      [
        "--encrypt",
        "--user-password=open-me",
        "--owner-password=owner",
        "--bits=256",
        "--",
      ],
      await samplePdf(),
    );
    expect(encrypted).not.toBeNull();
    expect(asText(encrypted!)).toContain("/Encrypt");
  });

  test("encrypt then decrypt round-trips back to a readable PDF", async () => {
    const source = await samplePdf();
    const encrypted = await runQpdf(
      ["--encrypt", "--user-password=pw", "--owner-password=pw", "--bits=256", "--"],
      source,
    );
    const decrypted = await runQpdf(["--decrypt", "--password=pw"], encrypted!);

    expect(decrypted).not.toBeNull();
    expect(asText(decrypted!)).not.toContain("/Encrypt");
    // pdf-lib refuses encrypted input, so a successful load proves decryption.
    const reopened = await PDFDocument.load(decrypted!, {
      updateMetadata: false,
    });
    expect(reopened.getPageCount()).toBe(1);
  });

  test("decrypting with the wrong password produces no output", async () => {
    const encrypted = await runQpdf(
      ["--encrypt", "--user-password=right", "--owner-password=right", "--bits=256", "--"],
      await samplePdf(),
    );
    const result = await runQpdf(["--decrypt", "--password=wrong"], encrypted!);
    expect(result).toBeNull();
  });

  test("linearizes a PDF", async () => {
    const out = await runQpdf(["--linearize"], await samplePdf());
    expect(out).not.toBeNull();
    expect(asText(out!)).toContain("/Linearized");
  });

  test("recovers a file with junk prepended before the PDF header", async () => {
    const source = await samplePdf();
    const junk = new TextEncoder().encode("Delivered-To: someone\r\n\r\n");
    const damaged = new Uint8Array(junk.length + source.length);
    damaged.set(junk, 0);
    damaged.set(source, junk.length);

    const repaired = await runQpdf([], damaged);
    expect(repaired).not.toBeNull();
    const reopened = await PDFDocument.load(repaired!, {
      updateMetadata: false,
    });
    expect(reopened.getPageCount()).toBe(1);
  });

  test("gives up when the cross-reference table is unreadable", async () => {
    // Documents why Repair PDF uses mupdf: this qpdf build does not
    // reconstruct a missing xref, it exits with an error and no output.
    const source = await samplePdf();
    const withoutStartxref = source.slice(
      0,
      asText(source).lastIndexOf("startxref"),
    );
    expect(await runQpdf([], withoutStartxref)).toBeNull();
  });

  test("refuses a file that is not a PDF at all", async () => {
    const result = await runQpdf([], new Uint8Array([1, 2, 3, 4]));
    expect(result).toBeNull();
  });
});
