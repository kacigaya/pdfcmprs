"use client";

import { OCR_LANGUAGES, ocrPdf } from "../../../features/pdf/services/ocrOps";
import {
  extractTables,
  pdfToCsv,
  pdfToExcel,
  pdfToJson,
} from "../../../features/pdf/services/textExport";
import { pdfToSvg } from "../../../features/pdf/services/vectorOps";
import { formatFileSize } from "../../../lib/files";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";

const SINGLE_PDF: ToolInputSpec = {
  kind: "single",
  batch: true,
  label: "Drop your PDF here",
  previews: true,
};

export const PdfToJsonPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Export JSON",
  runningLabel: "Extracting…",
  execute: async ({ files, report }) => {
    const out = await pdfToJson(files[0], report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages of positioned text · ${formatFileSize(out.blob.size)}.`,
      text: out.text.slice(0, 20000),
      message: "JSON export complete.",
    };
  },
});

export const PdfToCsvPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Export CSV",
  runningLabel: "Extracting…",
  execute: async ({ files, report }) => {
    const out = await pdfToCsv(files[0], report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.rowCount} rows detected across ${out.pageCount} pages.`,
      text: out.text.slice(0, 20000),
      message: `Exported ${out.rowCount} rows.`,
    };
  },
});

export const PdfToExcelPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Export XLSX",
  runningLabel: "Building…",
  execute: async ({ files, report }) => {
    const out = await pdfToExcel(files[0], report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.sheetCount} sheets · ${out.rowCount} rows · ${formatFileSize(out.blob.size)}.`,
      message: `Built a workbook with ${out.sheetCount} sheets.`,
    };
  },
});

export const ExtractTablesPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Extract Tables",
  runningLabel: "Scanning…",
  execute: async ({ files, report }) => {
    const out = await extractTables(files[0], report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.tableCount} table-like regions found.`,
      text: out.text.slice(0, 20000),
      message: `Found ${out.tableCount} tables.`,
    };
  },
});

export const PdfToSvgPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Export SVG",
  runningLabel: "Converting…",
  execute: async ({ files, report }) => {
    const out = await pdfToSvg(files[0], report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: out.zipped
        ? `${out.pageCount} SVG files packaged as ZIP · ${formatFileSize(out.blob.size)}.`
        : `One scalable SVG · ${formatFileSize(out.blob.size)}.`,
      message: `Exported ${out.pageCount} pages as SVG.`,
    };
  },
});

export const OcrPanel = createToolPanel({
  input: {
    kind: "single",
    batch: true,
    label: "Drop your scanned PDF here",
    hint: "Language data downloads on first use",
    previews: true,
  },
  fields: [
    {
      kind: "select",
      name: "language",
      label: "Language",
      default: "eng",
      options: OCR_LANGUAGES.map((option) => ({ ...option })),
    },
  ],
  actionLabel: "Run OCR",
  runningLabel: "Reading…",
  execute: async ({ files, values, report }) => {
    const out = await ocrPdf(files[0], String(values.language), report);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages made searchable · average confidence ${out.confidence.toFixed(0)}%.`,
      text: out.text.slice(0, 20000),
      message: "OCR complete.",
    };
  },
});
