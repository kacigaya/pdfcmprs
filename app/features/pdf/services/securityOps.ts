import { PDFDict, PDFName, PDFArray, PDFStream, type PDFObject } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { loadMupdf, runQpdf } from "../../../lib/wasm/loadEngine";
import { collectGarbage } from "./gc";
import { loadPdf, savePdf, type PdfSaveResult } from "./pdfCore";

const INPUT = "in.pdf";
const OUTPUT = "out.pdf";

async function qpdf(
  file: File,
  args: string[],
  suffix: string,
  onFailure?: (error: Error) => Error,
): Promise<PdfSaveResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let out: Uint8Array;
  try {
    out = await runQpdf([...args, INPUT, OUTPUT], { [INPUT]: bytes }, OUTPUT);
  } catch (error) {
    const asError =
      error instanceof Error ? error : new Error("qpdf failed.");
    throw onFailure ? onFailure(asError) : asError;
  }
  return {
    blob: bytesToPdfBlob(out),
    filename: withPdfExtension(file.name, suffix),
    pageCount: 0,
  };
}

export type EncryptionBits = "40" | "128" | "256";

export function encryptionArgs(userPassword: string, ownerPassword: string, bits: EncryptionBits): string[] {
  return [
    ...(bits === "40" ? ["--allow-weak-crypto"] : []),
    "--encrypt",
    `--user-password=${userPassword}`,
    `--owner-password=${ownerPassword || userPassword}`,
    `--bits=${bits}`,
    ...(bits === "128" ? ["--use-aes=y"] : []),
    "--",
  ];
}

export async function encryptPdf(
  file: File,
  userPassword: string,
  ownerPassword: string,
  bits: EncryptionBits,
): Promise<PdfSaveResult> {
  if (!userPassword && !ownerPassword) {
    throw new Error("Set a user password, an owner password, or both.");
  }
  return qpdf(
    file,
    encryptionArgs(userPassword, ownerPassword, bits),
    "-encrypted",
    (error) =>
      /already encrypted|invalid password/i.test(error.message)
        ? new Error(
            "This PDF is already encrypted. Decrypt it first, then re-encrypt.",
          )
        : error,
  );
}

export async function decryptPdf(
  file: File,
  password: string,
): Promise<PdfSaveResult> {
  return qpdf(
    file,
    ["--decrypt", `--password=${password}`],
    "-decrypted",
    () =>
      new Error(
        password
          ? "Wrong password, or this PDF cannot be decrypted with it."
          : "This PDF needs a password. Enter it and try again.",
      ),
  );
}

export interface PermissionSettings {
  print: "none" | "low" | "full";
  modify: "none" | "assembly" | "form" | "annotate" | "all";
  extract: boolean;
  annotate: boolean;
  accessibility: boolean;
}

export async function changePermissions(
  file: File,
  ownerPassword: string,
  userPassword: string,
  permissions: PermissionSettings,
): Promise<PdfSaveResult> {
  if (!ownerPassword) {
    throw new Error(
      "Set an owner password. Without one, anyone can remove the restrictions.",
    );
  }
  return qpdf(
    file,
    [
      "--encrypt",
      `--user-password=${userPassword}`,
      `--owner-password=${ownerPassword}`,
      "--bits=256",
      `--print=${permissions.print}`,
      `--modify=${permissions.modify}`,
      `--extract=${permissions.extract ? "y" : "n"}`,
      `--annotate=${permissions.annotate ? "y" : "n"}`,
      `--accessibility=${permissions.accessibility ? "y" : "n"}`,
      "--",
    ],
    "-permissions",
  );
}

/**
 * Rebuild a damaged PDF.
 *
 * mupdf rather than qpdf: qpdf gives up with "can't find startxref" when the
 * cross-reference table is unreadable, while mupdf reconstructs it by scanning
 * for objects. That fallback is the purpose of a repair tool.
 */
export async function repairPdf(file: File): Promise<PdfSaveResult> {
  const mupdf = await loadMupdf();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let rebuilt: Uint8Array;
  let pageCount: number;
  try {
    const doc = mupdf.Document.openDocument(bytes, "application/pdf");
    pageCount = doc.countPages();
    if (pageCount === 0) {
      throw new Error("No recoverable pages found.");
    }
    rebuilt = (doc as unknown as {
      saveToBuffer(options: string): { asUint8Array(): Uint8Array };
    })
      .saveToBuffer("garbage=compact")
      .asUint8Array();
  } catch (error) {
    throw new Error(
      `This file is too damaged to rebuild. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    );
  }
  return {
    blob: bytesToPdfBlob(rebuilt),
    filename: withPdfExtension(file.name, "-repaired"),
    pageCount,
  };
}

export async function linearizePdf(file: File): Promise<PdfSaveResult> {
  return qpdf(file, ["--linearize"], "-linearized");
}

export async function removeRestrictions(
  file: File,
): Promise<PdfSaveResult> {
  return qpdf(
    file,
    ["--remove-restrictions"],
    "-unrestricted",
    () =>
      new Error(
        "Could not remove restrictions because this PDF is encrypted. Use Decrypt PDF with its password instead.",
      ),
  );
}

export interface SanitizeReport {
  javascript: number;
  launchActions: number;
  embeddedFiles: number;
  openActions: number;
}

/**
 * Strip active content: document/page JavaScript, auto-run actions, launch
 * actions, and embedded file attachments. Objects are removed outright rather
 * than merely unlinked, so the payload cannot be recovered from the output.
 */
export async function sanitizePdf(
  file: File,
): Promise<PdfSaveResult & { report: SanitizeReport }> {
  const doc = await loadPdf(file);
  const catalog = doc.catalog;
  const report: SanitizeReport = {
    javascript: 0,
    launchActions: 0,
    embeddedFiles: 0,
    openActions: 0,
  };

  if (catalog.has(PDFName.of("OpenAction"))) {
    catalog.delete(PDFName.of("OpenAction"));
    report.openActions += 1;
  }
  if (catalog.has(PDFName.of("AA"))) {
    catalog.delete(PDFName.of("AA"));
    report.openActions += 1;
  }

  const names = catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (names) {
    if (names.has(PDFName.of("JavaScript"))) {
      names.delete(PDFName.of("JavaScript"));
      report.javascript += 1;
    }
    if (names.has(PDFName.of("EmbeddedFiles"))) {
      names.delete(PDFName.of("EmbeddedFiles"));
      report.embeddedFiles += 1;
    }
  }

  // Actions also live in form fields and /Next chains, not just annotations.
  const visited = new Set<PDFObject>();
  const pending: PDFObject[] = [catalog, ...doc.context.enumerateIndirectObjects().map(([, object]) => object)];
  while (pending.length) {
    const object = doc.context.lookup(pending.pop());
    if (!object || visited.has(object)) continue;
    visited.add(object);
    if (object instanceof PDFArray) {
      pending.push(...object.asArray());
      continue;
    }
    const dict = object instanceof PDFStream ? object.dict : object;
    if (!(dict instanceof PDFDict)) continue;

    const subtype = doc.context.lookup(dict.get(PDFName.of("S")));
    if (subtype === PDFName.of("JavaScript") || subtype === PDFName.of("Launch") || subtype === PDFName.of("SubmitForm")) {
      if (subtype === PDFName.of("JavaScript")) report.javascript += 1;
      else report.launchActions += 1;
      for (const key of dict.keys()) dict.delete(key);
      continue;
    }
    for (const key of ["OpenAction", "AA"]) {
      if (dict.has(PDFName.of(key))) {
        dict.delete(PDFName.of(key));
        report.openActions += 1;
      }
    }
    if (dict.has(PDFName.of("EF"))) {
      dict.delete(PDFName.of("EF"));
      report.embeddedFiles += 1;
    }
    dict.delete(PDFName.of("AF"));
    const annots = dict.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (annots) {
      for (let index = annots.size() - 1; index >= 0; index -= 1) {
        const annot = doc.context.lookup(annots.get(index));
        if (annot instanceof PDFDict && annot.get(PDFName.of("Subtype")) === PDFName.of("FileAttachment")) {
          annots.remove(index);
          report.embeddedFiles += 1;
        }
      }
    }
    const action = doc.context.lookup(dict.get(PDFName.of("A")));
    if (action instanceof PDFDict && (action.keys().length === 0 || ["JavaScript", "Launch", "SubmitForm"].some((name) => action.get(PDFName.of("S")) === PDFName.of(name)))) {
      if (action.keys().length) {
        if (action.get(PDFName.of("S")) === PDFName.of("JavaScript")) report.javascript += 1;
        else report.launchActions += 1;
        for (const key of action.keys()) action.delete(key);
        visited.add(action);
      }
      dict.delete(PDFName.of("A"));
    }
    pending.push(...dict.values());
  }

  // Unlinking alone leaves the payload recoverable in the output bytes.
  // sweep the now-unreachable objects so they are genuinely gone.
  collectGarbage(doc);

  const saved = await savePdf(doc, file.name, "-sanitized");
  return { ...saved, report };
}
