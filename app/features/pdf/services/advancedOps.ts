import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";
import { withPdfExtension } from "../../../lib/files";
import { loadMupdf, runGhostscript } from "../../../lib/wasm/loadEngine";
import { createStoredZip } from "../../../lib/zip";
import type { ProgressReporter } from "../types";
import { rasterizePdf, type RasterQuality } from "./rasterOps";
import { loadPdf, savePdf } from "./pdfCore";
import { readPositionedText } from "./textExport";

type OfficeConverter = import("@matbee/libreoffice-converter/browser").WorkerBrowserConverter;
let officeConverterPromise: Promise<OfficeConverter> | null = null;
type FullMupdf = import("@bentopdf/pymupdf-wasm").PyMuPDF;
let fullMupdfPromise: Promise<FullMupdf> | null = null;

function stopOfficeConverter(converter: OfficeConverter) {
  (converter as unknown as { worker: Worker | null }).worker?.terminate();
  officeConverterPromise = null;
}

async function getFullMupdf() {
  if (!fullMupdfPromise) {
    const moduleUrl = "/wasm/pymupdf/index.js";
    fullMupdfPromise = import(/* webpackIgnore: true */ moduleUrl).then(async ({ PyMuPDF }: typeof import("@bentopdf/pymupdf-wasm")) => {
      const engine = new PyMuPDF({ assetPath: "/wasm/pymupdf/" });
      await engine.load();
      return engine;
    }).catch((error) => {
      fullMupdfPromise = null;
      throw error;
    });
  }
  return fullMupdfPromise;
}

async function getOfficeConverter() {
  if (officeConverterPromise) return officeConverterPromise;
  const { WorkerBrowserConverter } = await import("@matbee/libreoffice-converter/browser");
  const converter = new WorkerBrowserConverter({
    sofficeJs: "/libreoffice-wasm/soffice.js",
    sofficeWasm: "/libreoffice-wasm/soffice.wasm",
    sofficeData: "/libreoffice-wasm/soffice.data",
    sofficeWorkerJs: "/libreoffice-wasm/soffice.worker.js",
    browserWorkerJs: "/libreoffice-wasm/browser.worker.global.js",
  });
  officeConverterPromise = new Promise<OfficeConverter>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("LibreOffice took too long to initialize. Reload the page and try again.")),
      90_000,
    );
    converter.initialize().then(
      () => { window.clearTimeout(timeout); resolve(converter); },
      (error) => { window.clearTimeout(timeout); reject(error); },
    );
  }).catch((error) => {
    stopOfficeConverter(converter);
    throw error;
  });
  return officeConverterPromise;
}

export async function ghostscriptPdf(
  file: File,
  mode: "pdfa1" | "pdfa2" | "pdfa3" | "outlines",
) {
  const args = ["-q", "-dNOPAUSE", "-dBATCH", "-dNOSAFER", "-sDEVICE=pdfwrite"];
  const inputs: Record<string, Uint8Array> = { "in.pdf": new Uint8Array(await file.arrayBuffer()) };
  if (mode === "outlines") {
    args.push("-dNoOutputFonts", "-dCompatibilityLevel=1.7");
  } else {
    const icc = new Uint8Array(await (await fetch("/wasm/ghostscript/srgb.icc")).arrayBuffer());
    const hex = Array.from(icc, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const subtype = mode === "pdfa1" ? "/GTS_PDFA1" : "/GTS_PDFA";
    inputs["pdfa.ps"] = new TextEncoder().encode(`%!
[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA} << /N 3 >> /PUT pdfmark
[{icc_PDFA} <${hex}> /PUT pdfmark
[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} << /Type /OutputIntent /S ${subtype} /DestOutputProfile {icc_PDFA} /OutputConditionIdentifier (sRGB IEC61966-2.1) /Info (sRGB IEC61966-2.1) /RegistryName (http://www.color.org) >> /PUT pdfmark
[{Catalog} << /OutputIntents [ {OutputIntent_PDFA} ] >> /PUT pdfmark
`);
    args.push(
      `-dPDFA=${mode.slice(-1)}`,
      "-dPDFACompatibilityPolicy=1",
      `-dCompatibilityLevel=${mode === "pdfa1" ? "1.4" : "1.7"}`,
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-dEmbedAllFonts=true",
      "-dSubsetFonts=true",
      "-dWriteObjStms=false",
      "-dWriteXRefStm=false",
    );
  }
  args.push("-dAutoRotatePages=/None", "-sOutputFile=out.pdf", ...(mode === "outlines" ? [] : ["pdfa.ps"]), "in.pdf");
  const bytes = await runGhostscript(args, inputs, "out.pdf");
  return {
    blob: bytesToPdfBlob(bytes),
    filename: withPdfExtension(file.name, mode === "outlines" ? "-outlined" : `-${mode}`),
  };
}

export function rasterizeDocument(file: File, quality: RasterQuality, report?: ProgressReporter) {
  return rasterizePdf(file, () => undefined, { quality, suffix: "-rasterized", report });
}

export function changeTextColor(
  file: File,
  hex: string,
  quality: RasterQuality,
  report?: ProgressReporter,
) {
  const [r, g, b] = /^#[0-9a-f]{6}$/i.test(hex)
    ? [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
    : [0, 0, 0];
  return rasterizePdf(
    file,
    ({ data }) => {
      for (let i = 0; i < data.length; i += 4) {
        const ink = 1 - (data[i] + data[i + 1] + data[i + 2]) / 765;
        if (ink < 0.12) continue;
        data[i] = 255 + (r - 255) * ink;
        data[i + 1] = 255 + (g - 255) * ink;
        data[i + 2] = 255 + (b - 255) * ink;
      }
    },
    { quality, suffix: "-text-color", report },
  );
}

export function deskewPdf(file: File, quality: RasterQuality, report?: ProgressReporter) {
  return rasterizePdf(
    file,
    (pixels) => {
      const { data, width, height } = pixels;
      let bestAngle = 0;
      let bestScore = -1;
      // ponytail: coarse projection search is capped at ±6°; use OpenCV Hough lines if wider scan skew becomes common.
      for (let angle = -6; angle <= 6; angle += 0.5) {
        const slope = Math.tan((angle * Math.PI) / 180);
        const bins = new Uint32Array(height + Math.ceil(width * Math.abs(slope)) + 2);
        const offset = slope < 0 ? Math.ceil(-width * slope) : 0;
        for (let y = 0; y < height; y += 3) {
          for (let x = 0; x < width; x += 3) {
            const index = (y * width + x) * 4;
            const ink = 765 - data[index] - data[index + 1] - data[index + 2];
            if (ink > 180) bins[Math.round(y + x * slope + offset)] += ink;
          }
        }
        let score = 0;
        for (const value of bins) score += value * value;
        if (score > bestScore) { bestScore = score; bestAngle = angle; }
      }
      if (Math.abs(bestAngle) < 0.25) return;
      const source = new Uint8ClampedArray(data);
      data.fill(255);
      const radians = (-bestAngle * Math.PI) / 180;
      const cosine = Math.cos(radians);
      const sine = Math.sin(radians);
      const cx = width / 2;
      const cy = height / 2;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const sx = Math.round(cosine * (x - cx) + sine * (y - cy) + cx);
          const sy = Math.round(-sine * (x - cx) + cosine * (y - cy) + cy);
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const target = (y * width + x) * 4;
          const origin = (sy * width + sx) * 4;
          data.set(source.subarray(origin, origin + 4), target);
        }
      }
    },
    { quality, suffix: "-deskewed", report },
  );
}

export async function rotateCustom(file: File, angle: number) {
  const source = await loadPdf(file);
  const out = await PDFDocument.create();
  const radians = (angle * Math.PI) / 180;
  for (const sourcePage of source.getPages()) {
    const embedded = await out.embedPage(sourcePage);
    const w = sourcePage.getWidth();
    const h = sourcePage.getHeight();
    const width = Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians));
    const height = Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians));
    const page = out.addPage([width, height]);
    page.drawPage(embedded, {
      x: width / 2 - w / 2,
      y: height / 2 - h / 2,
      width: w,
      height: h,
      rotate: degrees(angle),
      xSkew: degrees(0),
      ySkew: degrees(0),
    });
  }
  return savePdf(out, file.name, "-rotated-custom");
}

export async function extractImages(file: File, report?: ProgressReporter) {
  const mupdf = await loadMupdf();
  const doc = mupdf.Document.openDocument(new Uint8Array(await file.arrayBuffer()), "application/pdf");
  const entries: { filename: string; bytes: Uint8Array }[] = [];
  try {
    for (let pageIndex = 0; pageIndex < doc.countPages(); pageIndex += 1) {
      let imageIndex = 0;
      const device = new mupdf.Device({
        fillImage(image) {
          imageIndex += 1;
          entries.push({
            filename: `page-${pageIndex + 1}-image-${imageIndex}.png`,
            bytes: new Uint8Array(image.toPixmap().asPNG()),
          });
        },
      });
      doc.loadPage(pageIndex).run(device, [1, 0, 0, 1, 0, 0]);
      device.close();
      report?.(((pageIndex + 1) / doc.countPages()) * 95);
    }
  } finally {
    doc.destroy();
  }
  if (!entries.length) throw new Error("No embedded raster images were found.");
  return { blob: createStoredZip(entries), filename: `${file.name.replace(/\.pdf$/i, "")}-images.zip`, count: entries.length };
}

export async function documentToPdf(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "document";
  const office = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "odg", "rtf", "pub", "wpd", "wps", "vsd", "pages"]);
  if (office.has(extension)) {
    const converter = await getOfficeConverter();
    const input = new Uint8Array(await file.arrayBuffer());
    const result = await new Promise<Awaited<ReturnType<OfficeConverter["convert"]>>>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        stopOfficeConverter(converter);
        reject(new Error("LibreOffice took too long to convert this document. Reload the page and try a smaller file."));
      }, 120_000);
      converter.convert(input, {
        outputFormat: "pdf",
        inputFormat: extension as "doc",
      }, file.name).then(
        (value) => { window.clearTimeout(timeout); resolve(value); },
        (error) => { window.clearTimeout(timeout); reject(error); },
      );
    });
    return { blob: bytesToPdfBlob(new Uint8Array(result.data)), filename: `${file.name.replace(/\.[^.]+$/, "")}.pdf` };
  }

  const engine = await getFullMupdf();
  return {
    blob: await engine.convertToPdf(file, { filetype: extension }),
    filename: `${file.name.replace(/\.[^.]+$/, "")}.pdf`,
  };
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function pdfToMarkdown(file: File, report?: ProgressReporter) {
  const pages = await readPositionedText(file, report);
  const text = pages.map((page) => `## Page ${page.page}\n\n${page.items.map((item) => item.text).join(" ")}`).join("\n\n---\n\n");
  return { blob: new Blob([text], { type: "text/markdown" }), filename: file.name.replace(/\.pdf$/i, ".md"), text };
}

export async function pdfForAi(file: File, report?: ProgressReporter) {
  const pages = await readPositionedText(file, report);
  const data = { filename: file.name, pageCount: pages.length, pages: pages.map((page) => ({ page: page.page, text: page.items.map((item) => item.text).join(" "), blocks: page.items })) };
  const text = JSON.stringify(data, null, 2);
  return { blob: new Blob([text], { type: "application/json" }), filename: file.name.replace(/\.pdf$/i, "-ai.json"), text };
}

export async function pdfToDocx(file: File, report?: ProgressReporter) {
  const pages = await readPositionedText(file, report);
  const paragraphs = pages.flatMap((page) => [
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Page ${page.page}</w:t></w:r></w:p>`,
    ...page.items.map((item) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(item.text)}</w:t></w:r></w:p>`),
  ]).join("");
  const encoder = new TextEncoder();
  const blob = createStoredZip([
    { filename: "[Content_Types].xml", bytes: encoder.encode(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`) },
    { filename: "_rels/.rels", bytes: encoder.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { filename: "word/document.xml", bytes: encoder.encode(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`) },
  ]);
  return { blob, filename: file.name.replace(/\.pdf$/i, ".docx") };
}

export async function addVisibleSignature(file: File, text: string, pageNumber: number) {
  const doc = await loadPdf(file);
  const page = doc.getPage(Math.max(0, Math.min(doc.getPageCount() - 1, pageNumber - 1)));
  const font = await doc.embedFont(StandardFonts.HelveticaOblique);
  page.drawRectangle({ x: 36, y: 36, width: 220, height: 54, borderWidth: 1, borderColor: rgb(0.15, 0.25, 0.55), color: rgb(0.96, 0.97, 1) });
  page.drawText(text || "Signed", { x: 48, y: 58, size: 18, font, color: rgb(0.1, 0.2, 0.5), maxWidth: 195 });
  return savePdf(doc, file.name, "-signed-visible");
}

export async function digitalSign(file: File, certificate: File, password: string, tsaUrl?: string) {
  const { PdfSigner } = await import("zgapdfsigner");
  const signer = new PdfSigner({
    p12cert: new Uint8Array(await certificate.arrayBuffer()),
    pwd: password,
    reason: "Digitally signed",
    signdate: tsaUrl ? { url: tsaUrl } : new Date(),
  });
  const bytes = await signer.sign(new Uint8Array(await file.arrayBuffer()));
  return { blob: bytesToPdfBlob(bytes), filename: withPdfExtension(file.name, tsaUrl ? "-timestamped" : "-digitally-signed") };
}

export async function timestampPdf(file: File, tsaUrl: string) {
  const url = new URL(tsaUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use a valid HTTP(S) timestamp authority URL.");
  try {
    const { PdfSigner } = await import("zgapdfsigner");
    const bytes = await new PdfSigner({ signdate: { url: url.href } }).sign(new Uint8Array(await file.arrayBuffer()));
    return { blob: bytesToPdfBlob(bytes), filename: withPdfExtension(file.name, "-timestamped") };
  } catch (error) {
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error("The timestamp authority blocked this browser request. Use a TSA that permits cross-origin POST requests.");
    }
    throw error;
  }
}

export async function inspectSignatures(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const raw = new TextDecoder("latin1").decode(bytes);
  const ranges = [...raw.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  const signatures = ranges.map((match, index) => {
    const values = match.slice(1).map(Number);
    const coverage = values[0] === 0 && values[2] + values[3] <= bytes.length;
    return { signature: index + 1, byteRange: values, structurallyValid: coverage, coversBytes: values[1] + values[3], fileBytes: bytes.length };
  });
  const report = { filename: file.name, signatureCount: signatures.length, signatures };
  const text = JSON.stringify(report, null, 2);
  return { blob: new Blob([text], { type: "application/json" }), filename: file.name.replace(/\.pdf$/i, "-signature-report.json"), text, count: signatures.length };
}
