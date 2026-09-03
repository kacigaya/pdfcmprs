"use client";

import { filterPdfFiles, formatFileSize } from "../../../lib/files";
import {
  addBlankPages,
  alternateMix,
  combineToSinglePage,
  deletePages,
  dividePages,
  extractPages,
  pdfsToZip,
  reversePages,
  rotatePages,
  type BlankPagePosition,
  type StackDirection,
} from "../../../features/pdf/services/pageOps";
import {
  bookletPdf,
  nUpPdf,
  posterizePdf,
} from "../../../features/pdf/services/impositionOps";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";

const SINGLE_PDF: ToolInputSpec = {
  kind: "single",
  batch: true,
  label: "Drop your PDF here",
  previews: true,
};

const MULTI_PDF: ToolInputSpec = {
  kind: "multiple",
  label: "Drop your PDFs here",
  previews: true,
  filter: filterPdfFiles,
};

const PAGE_SIZE_OPTIONS = [
  { label: "Match first page", value: "match" },
  { label: "A4", value: "a4" },
  { label: "A3", value: "a3" },
  { label: "A5", value: "a5" },
  { label: "US Letter", value: "letter" },
  { label: "US Legal", value: "legal" },
  { label: "Tabloid", value: "tabloid" },
];

export const RotatePanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: {
    label: "Pages to rotate",
    hint: "Leave empty to rotate every page.",
  },
  fields: [
    {
      kind: "select",
      name: "turn",
      label: "Rotation",
      default: "90",
      options: [
        { label: "90° clockwise", value: "90" },
        { label: "180°", value: "180" },
        { label: "90° counter-clockwise", value: "270" },
      ],
    },
  ],
  actionLabel: "Rotate Pages",
  runningLabel: "Rotating…",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await rotatePages(files[0], selection, Number(values.turn));
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages, rotated by ${values.turn}°.`,
      message: `Rotation complete. ${values.turn}° applied.`,
    };
  },
});

export const DeletePagesPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to delete", required: true },
  actionLabel: "Delete Pages",
  runningLabel: "Deleting…",
  execute: async ({ files, selection, report }) => {
    report(40);
    const out = await deletePages(files[0], selection);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.removed} pages removed · ${out.pageCount} remaining.`,
      message: `Deleted ${out.removed} pages.`,
    };
  },
});

export const ExtractPagesPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to extract", required: true },
  actionLabel: "Extract Pages",
  runningLabel: "Extracting…",
  execute: async ({ files, selection, report }) => {
    report(40);
    const out = await extractPages(files[0], selection);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Extracted pages: ${out.pages.join(", ")}.`,
      message: `Extraction complete. ${out.pages.length} pages extracted.`,
    };
  },
});

export const ReversePagesPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Reverse Order",
  runningLabel: "Reversing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await reversePages(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages, last to first.`,
      message: "Page order reversed.",
    };
  },
});

export const AddBlankPagePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "select",
      name: "position",
      label: "Insert at",
      default: "end",
      options: [
        { label: "End of document", value: "end" },
        { label: "Start of document", value: "start" },
        { label: "After a specific page", value: "after" },
        { label: "Between every page", value: "between-all" },
      ],
    },
    {
      kind: "number",
      name: "afterPage",
      label: "After page",
      default: 1,
      min: 1,
      visibleWhen: (values) => values.position === "after",
    },
    {
      kind: "number",
      name: "count",
      label: "How many",
      default: 1,
      min: 1,
      max: 50,
    },
    {
      kind: "select",
      name: "size",
      label: "Page size",
      default: "match",
      options: PAGE_SIZE_OPTIONS,
    },
  ],
  actionLabel: "Add Blank Pages",
  runningLabel: "Adding…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await addBlankPages(
      files[0],
      values.position as BlankPagePosition,
      Number(values.afterPage),
      Number(values.count),
      String(values.size),
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.added} blank pages added · ${out.pageCount} total.`,
      message: `Added ${out.added} blank pages.`,
    };
  },
});

export const AlternateMixPanel = createToolPanel({
  input: {
    ...MULTI_PDF,
    label: "Drop two PDFs here",
    hint: "First file supplies the odd pages, second the even",
    minFiles: 2,
  },
  fields: [
    {
      kind: "checkbox",
      name: "reverseSecond",
      label: "Reverse the second document (for back-side scans)",
      default: false,
    },
  ],
  actionLabel: "Alternate & Mix",
  runningLabel: "Mixing…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await alternateMix(files, Boolean(values.reverseSecond));
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages interleaved from ${files.length} files.`,
      message: `Mixed into ${out.pageCount} pages.`,
    };
  },
});

export const CombineToSinglePagePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "select",
      name: "direction",
      label: "Stack direction",
      default: "vertical",
      options: [
        { label: "Vertical (one tall page)", value: "vertical" },
        { label: "Horizontal (one wide page)", value: "horizontal" },
      ],
    },
    {
      kind: "number",
      name: "gap",
      label: "Gap between pages (pt)",
      default: 0,
      min: 0,
      max: 200,
    },
  ],
  actionLabel: "Combine Pages",
  runningLabel: "Combining…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await combineToSinglePage(
      files[0],
      values.direction as StackDirection,
      Number(values.gap),
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: "All pages drawn onto one sheet.",
      message: "Combined into a single page.",
    };
  },
});

export const DividePagesPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "number", name: "columns", label: "Columns", default: 2, min: 1, max: 10 },
    { kind: "number", name: "rows", label: "Rows", default: 1, min: 1, max: 10 },
  ],
  actionLabel: "Divide Pages",
  runningLabel: "Dividing…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await dividePages(
      files[0],
      Number(values.columns),
      Number(values.rows),
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Each page split into ${values.columns} x ${values.rows} · ${out.pageCount} pages total.`,
      message: `Divided into ${out.pageCount} pages.`,
    };
  },
});

export const NUpPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "number", name: "columns", label: "Columns", default: 2, min: 1, max: 8 },
    { kind: "number", name: "rows", label: "Rows", default: 2, min: 1, max: 8 },
    { kind: "number", name: "margin", label: "Sheet margin (pt)", default: 18, min: 0 },
    { kind: "number", name: "spacing", label: "Gap between pages (pt)", default: 8, min: 0 },
    { kind: "checkbox", name: "landscape", label: "Landscape sheets", default: false },
  ],
  actionLabel: "Combine N-Up",
  runningLabel: "Imposing…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await nUpPdf(files[0], {
      columns: Number(values.columns),
      rows: Number(values.rows),
      margin: Number(values.margin),
      spacing: Number(values.spacing),
      landscape: Boolean(values.landscape),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.perSheet} pages per sheet · ${out.pageCount} sheets produced.`,
      message: `Imposed ${out.perSheet}-up onto ${out.pageCount} sheets.`,
    };
  },
});

export const BookletPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "number", name: "margin", label: "Sheet margin (pt)", default: 12, min: 0 },
    { kind: "number", name: "spacing", label: "Centre gutter (pt)", default: 0, min: 0 },
  ],
  actionLabel: "Build Booklet",
  runningLabel: "Imposing…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await bookletPdf(files[0], {
      margin: Number(values.margin),
      spacing: Number(values.spacing),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description:
        `${out.sheets} sheets in saddle-stitch order. Print double-sided, flip on the short edge, then fold.` +
        (out.padded > 0 ? ` ${out.padded} blank pages added as padding.` : ""),
      message: `Booklet ready: ${out.sheets} sheets.`,
    };
  },
});

export const PosterizePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "number", name: "columns", label: "Sheets across", default: 2, min: 1, max: 10 },
    { kind: "number", name: "rows", label: "Sheets down", default: 2, min: 1, max: 10 },
    {
      kind: "number",
      name: "overlap",
      label: "Overlap (pt)",
      default: 18,
      min: 0,
      hint: "Repeats a strip on adjacent tiles so sheets can be trimmed and taped.",
    },
  ],
  actionLabel: "Build Poster",
  runningLabel: "Tiling…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await posterizePdf(files[0], {
      columns: Number(values.columns),
      rows: Number(values.rows),
      overlap: Number(values.overlap),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.tilesPerPage} tiles per page · ${out.pageCount} sheets to print and tape.`,
      message: `Poster split into ${out.pageCount} sheets.`,
    };
  },
});

export const PdfsToZipPanel = createToolPanel({
  input: {
    ...MULTI_PDF,
    hint: "Bundles the files as-is, no re-encoding",
  },
  actionLabel: "Create ZIP",
  runningLabel: "Packaging…",
  execute: async ({ files, report }) => {
    report(50);
    const out = await pdfsToZip(files);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.count} PDFs · ${formatFileSize(out.blob.size)}.`,
      message: `Packaged ${out.count} PDFs.`,
    };
  },
});
