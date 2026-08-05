import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { loadCpdf } from "../../../lib/wasm/loadEngine";
import { createStoredZip } from "../../../lib/zip";

async function withCpdf<T>(file: File, action: (cpdf: typeof import("coherentpdf"), pdf: import("coherentpdf").Pdf) => Promise<T> | T) {
  const cpdf = await loadCpdf();
  const pdf = cpdf.fromMemory(new Uint8Array(await file.arrayBuffer()), "");
  try {
    return await action(cpdf, pdf);
  } finally {
    cpdf.deletePdf(pdf);
  }
}

function output(cpdf: typeof import("coherentpdf"), pdf: import("coherentpdf").Pdf, name: string, suffix: string) {
  return { blob: bytesToPdfBlob(new Uint8Array(cpdf.toMemory(pdf, false, false))), filename: withPdfExtension(name, suffix) };
}

export async function addAttachments(pdfFile: File, attachments: File[]) {
  return withCpdf(pdfFile, async (cpdf, pdf) => {
    for (const file of attachments) cpdf.attachFileFromMemory(new Uint8Array(await file.arrayBuffer()), file.name, pdf);
    return output(cpdf, pdf, pdfFile.name, "-attachments-added");
  });
}

export async function removeAttachments(file: File) {
  return withCpdf(file, (cpdf, pdf) => {
    cpdf.removeAttachedFiles(pdf);
    return output(cpdf, pdf, file.name, "-attachments-removed");
  });
}

export async function extractAttachments(file: File) {
  return withCpdf(file, (cpdf, pdf) => {
    cpdf.startGetAttachments(pdf);
    try {
      const count = cpdf.numberGetAttachments();
      if (!count) throw new Error("This PDF has no attachments.");
      const entries = Array.from({ length: count }, (_, index) => ({
        filename: cpdf.getAttachmentName(index) || `attachment-${index + 1}`,
        bytes: new Uint8Array(cpdf.getAttachmentData(index)),
      }));
      return { blob: createStoredZip(entries), filename: `${file.name.replace(/\.pdf$/i, "")}-attachments.zip`, count };
    } finally {
      cpdf.endGetAttachments();
    }
  });
}

export async function editBookmarks(file: File, json?: string) {
  return withCpdf(file, (cpdf, pdf) => {
    if (!json?.trim()) {
      const text = new TextDecoder().decode(cpdf.getBookmarksJSON(pdf));
      return { blob: new Blob([text], { type: "application/json" }), filename: file.name.replace(/\.pdf$/i, "-bookmarks.json"), text };
    }
    JSON.parse(json);
    cpdf.setBookmarksJSON(pdf, new TextEncoder().encode(json));
    return output(cpdf, pdf, file.name, "-bookmarks-edited");
  });
}

export async function addPageLabels(file: File, styleName: string, prefix: string, start: number) {
  return withCpdf(file, (cpdf, pdf) => {
    const styles: Record<string, number> = {
      decimal: cpdf.decimalArabic,
      romanUpper: cpdf.uppercaseRoman,
      romanLower: cpdf.lowercaseRoman,
      lettersUpper: cpdf.uppercaseLetters,
      lettersLower: cpdf.lowercaseLetters,
    };
    cpdf.addPageLabels(pdf, styles[styleName] ?? cpdf.decimalArabic, prefix, start - 1, cpdf.all(pdf), true);
    return output(cpdf, pdf, file.name, "-page-labels");
  });
}

export async function overlayPdfs(baseFile: File, overlayFile: File, over: boolean) {
  const cpdf = await loadCpdf();
  const base = cpdf.fromMemory(new Uint8Array(await baseFile.arrayBuffer()), "");
  const overlay = cpdf.fromMemory(new Uint8Array(await overlayFile.arrayBuffer()), "");
  const range = cpdf.all(base);
  try {
    (over ? cpdf.stampOn : cpdf.stampUnder)(overlay, base, range);
    return output(cpdf, base, baseFile.name, over ? "-overlay" : "-underlay");
  } finally {
    cpdf.deletePdf(overlay);
    cpdf.deletePdf(base);
  }
}

export async function editLayers(file: File, from: string, to: string) {
  return withCpdf(file, (cpdf, pdf) => {
    const count = cpdf.startGetOCGList(pdf);
    let layers: string[];
    try {
      layers = Array.from({ length: count }, (_, index) => cpdf.ocgListEntry(index));
    } finally {
      cpdf.endGetOCGList();
    }
    if (!from.trim()) {
      const text = JSON.stringify(layers, null, 2);
      return { blob: new Blob([text], { type: "application/json" }), filename: file.name.replace(/\.pdf$/i, "-layers.json"), text };
    }
    if (!layers.includes(from)) throw new Error(`Layer “${from}” was not found.`);
    cpdf.ocgRename(pdf, from, to || from);
    cpdf.ocgCoalesce(pdf);
    cpdf.ocgOrderAll(pdf);
    return output(cpdf, pdf, file.name, "-layers-edited");
  });
}
