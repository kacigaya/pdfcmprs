"use client";

import {
  changeBackground,
  cropPdf,
  describePageDimensions,
  editMetadata,
  fixPageSize,
  flattenPdf,
  generateTableOfContents,
  removeAnnotations,
  removeMetadata,
  type MetadataFields,
  type PageSizeMode,
} from "../../../features/pdf/services/editOps";
import { removeBlankPages } from "../../../features/pdf/services/pageOps";
import {
  addBatesNumbering,
  addHeaderFooter,
  addPageNumbers,
  addTextStamp,
  addWatermark,
  ANCHOR_OPTIONS,
  FONT_OPTIONS,
  type Anchor,
} from "../../../features/pdf/services/textOverlay";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";
import type { OptionField } from "../OptionsForm";

const SINGLE_PDF: ToolInputSpec = {
  kind: "single",
  batch: true,
  label: "Drop your PDF here",
  previews: true,
};

const ANCHORS = ANCHOR_OPTIONS.map((option) => ({ ...option }));
const FONTS = FONT_OPTIONS.map((option) => ({ ...option }));

const FONT_FIELD: OptionField = {
  kind: "select",
  name: "fontName",
  label: "Font",
  default: FONTS[0].value,
  options: FONTS,
};

const COLOR_FIELD: OptionField = {
  kind: "color",
  name: "color",
  label: "Colour",
  default: "#111111",
};

export const PageNumbersPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: {
    label: "Pages to number",
    hint: "Leave empty to number every page.",
  },
  fields: [
    {
      kind: "text",
      name: "format",
      label: "Format",
      default: "{n}",
      placeholder: "{n} of {total}",
      hint: "{n} counter · {total} count · {page} real page · {filename}",
      mono: true,
    },
    { kind: "number", name: "startAt", label: "Start at", default: 1, min: 0 },
    {
      kind: "select",
      name: "anchor",
      label: "Position",
      default: "bottom-center",
      options: ANCHORS,
    },
    FONT_FIELD,
    { kind: "number", name: "size", label: "Font size", default: 10, min: 4, max: 96 },
    COLOR_FIELD,
    { kind: "number", name: "marginX", label: "Side margin (pt)", default: 36, min: 0 },
    { kind: "number", name: "marginY", label: "Edge margin (pt)", default: 28, min: 0 },
  ],
  actionLabel: "Add page numbers",
  runningLabel: "Numbering…",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await addPageNumbers(files[0], {
      selection,
      format: String(values.format),
      startAt: Number(values.startAt),
      anchor: values.anchor as Anchor,
      fontName: String(values.fontName),
      size: Number(values.size),
      color: String(values.color),
      marginX: Number(values.marginX),
      marginY: Number(values.marginY),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.stamped} pages numbered.`,
      message: `Numbered ${out.stamped} pages.`,
    };
  },
});

export const BatesPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to stamp", hint: "Leave empty for every page." },
  fields: [
    { kind: "text", name: "prefix", label: "Prefix", default: "", placeholder: "ABC-" },
    { kind: "text", name: "suffix", label: "Suffix", default: "" },
    { kind: "number", name: "startAt", label: "Start at", default: 1, min: 0 },
    { kind: "number", name: "digits", label: "Digits", default: 6, min: 1, max: 12 },
    { kind: "number", name: "step", label: "Increment", default: 1, min: 1 },
    {
      kind: "select",
      name: "anchor",
      label: "Position",
      default: "bottom-right",
      options: ANCHORS,
    },
    FONT_FIELD,
    { kind: "number", name: "size", label: "Font size", default: 9, min: 4, max: 96 },
    COLOR_FIELD,
    { kind: "number", name: "marginX", label: "Side margin (pt)", default: 28, min: 0 },
    { kind: "number", name: "marginY", label: "Edge margin (pt)", default: 20, min: 0 },
  ],
  actionLabel: "Apply Bates numbering",
  runningLabel: "Stamping…",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await addBatesNumbering(files[0], {
      selection,
      prefix: String(values.prefix),
      suffix: String(values.suffix),
      startAt: Number(values.startAt),
      digits: Number(values.digits),
      step: Number(values.step),
      anchor: values.anchor as Anchor,
      fontName: String(values.fontName),
      size: Number(values.size),
      color: String(values.color),
      marginX: Number(values.marginX),
      marginY: Number(values.marginY),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.stamped} pages stamped, starting at ${values.startAt}.`,
      message: `Stamped ${out.stamped} pages.`,
    };
  },
});

export const WatermarkPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to watermark", hint: "Leave empty for every page." },
  fields: [
    {
      kind: "text",
      name: "text",
      label: "Watermark text",
      default: "CONFIDENTIAL",
    },
    FONT_FIELD,
    { kind: "number", name: "size", label: "Font size", default: 56, min: 6, max: 300 },
    { kind: "color", name: "color", label: "Colour", default: "#ff0000" },
    {
      kind: "number",
      name: "opacity",
      label: "Opacity (0-1)",
      default: 0.2,
      min: 0.01,
      max: 1,
      step: 0.05,
    },
    { kind: "number", name: "rotate", label: "Rotation (°)", default: 45, min: -180, max: 180 },
    {
      kind: "select",
      name: "anchor",
      label: "Position",
      default: "center",
      options: ANCHORS,
    },
  ],
  actionLabel: "Add watermark",
  runningLabel: "Watermarking…",
  validate: ({ values }) =>
    String(values.text).trim() ? null : "Enter the watermark text.",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await addWatermark(files[0], {
      selection,
      text: String(values.text),
      fontName: String(values.fontName),
      size: Number(values.size),
      color: String(values.color),
      opacity: Number(values.opacity),
      rotate: Number(values.rotate),
      anchor: values.anchor as Anchor,
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Watermarked ${out.stamped} pages.`,
      message: `Watermarked ${out.stamped} pages.`,
    };
  },
});

export const HeaderFooterPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages", hint: "Leave empty for every page." },
  fields: [
    {
      kind: "text",
      name: "headerText",
      label: "Header",
      default: "",
      placeholder: "{filename}",
      mono: true,
    },
    {
      kind: "text",
      name: "footerText",
      label: "Footer",
      default: "Page {n} of {total}",
      mono: true,
    },
    {
      kind: "select",
      name: "align",
      label: "Alignment",
      default: "center",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    FONT_FIELD,
    { kind: "number", name: "size", label: "Font size", default: 9, min: 4, max: 48 },
    COLOR_FIELD,
    { kind: "number", name: "marginX", label: "Side margin (pt)", default: 36, min: 0 },
    { kind: "number", name: "marginY", label: "Edge margin (pt)", default: 24, min: 0 },
  ],
  actionLabel: "Add header & footer",
  runningLabel: "Applying…",
  validate: ({ values }) =>
    String(values.headerText).trim() || String(values.footerText).trim()
      ? null
      : "Enter header text, footer text, or both.",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await addHeaderFooter(files[0], {
      selection,
      headerText: String(values.headerText),
      footerText: String(values.footerText),
      fontName: String(values.fontName),
      size: Number(values.size),
      color: String(values.color),
      marginX: Number(values.marginX),
      marginY: Number(values.marginY),
      align: values.align as "left" | "center" | "right",
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.stamped} lines drawn across ${out.pageCount} pages.`,
      message: "Header and footer applied.",
    };
  },
});

export const StampsPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to stamp", hint: "Leave empty for every page." },
  fields: [
    { kind: "text", name: "text", label: "Stamp text", default: "APPROVED" },
    {
      kind: "select",
      name: "anchor",
      label: "Position",
      default: "top-right",
      options: ANCHORS,
    },
    FONT_FIELD,
    { kind: "number", name: "size", label: "Font size", default: 24, min: 6, max: 200 },
    { kind: "color", name: "color", label: "Colour", default: "#1a7f37" },
    {
      kind: "number",
      name: "opacity",
      label: "Opacity (0-1)",
      default: 0.85,
      min: 0.01,
      max: 1,
      step: 0.05,
    },
    { kind: "number", name: "rotate", label: "Rotation (°)", default: 0, min: -180, max: 180 },
    { kind: "number", name: "marginX", label: "Side margin (pt)", default: 32, min: 0 },
    { kind: "number", name: "marginY", label: "Edge margin (pt)", default: 32, min: 0 },
  ],
  actionLabel: "Add stamp",
  runningLabel: "Stamping…",
  validate: ({ values }) =>
    String(values.text).trim() ? null : "Enter the stamp text.",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await addTextStamp(files[0], {
      selection,
      text: String(values.text),
      fontName: String(values.fontName),
      size: Number(values.size),
      color: String(values.color),
      opacity: Number(values.opacity),
      rotate: Number(values.rotate),
      anchor: values.anchor as Anchor,
      marginX: Number(values.marginX),
      marginY: Number(values.marginY),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Stamped ${out.stamped} pages.`,
      message: `Stamped ${out.stamped} pages.`,
    };
  },
});

export const CropPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages to crop", hint: "Leave empty for every page." },
  fields: [
    { kind: "number", name: "top", label: "Trim top (pt)", default: 0, min: 0 },
    { kind: "number", name: "right", label: "Trim right (pt)", default: 0, min: 0 },
    { kind: "number", name: "bottom", label: "Trim bottom (pt)", default: 0, min: 0 },
    { kind: "number", name: "left", label: "Trim left (pt)", default: 0, min: 0 },
  ],
  actionLabel: "Crop",
  runningLabel: "Cropping…",
  validate: ({ values }) =>
    Number(values.top) + Number(values.right) + Number(values.bottom) + Number(values.left) > 0
      ? null
      : "Set at least one margin to trim.",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await cropPdf(files[0], {
      selection,
      top: Number(values.top),
      right: Number(values.right),
      bottom: Number(values.bottom),
      left: Number(values.left),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.cropped} pages cropped. The trimmed content is hidden, not deleted.`,
      message: `Cropped ${out.cropped} pages.`,
    };
  },
});

export const FixPageSizePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "select",
      name: "size",
      label: "Target size",
      default: "a4",
      options: [
        { label: "A4", value: "a4" },
        { label: "A3", value: "a3" },
        { label: "A5", value: "a5" },
        { label: "US Letter", value: "letter" },
        { label: "US Legal", value: "legal" },
        { label: "Tabloid", value: "tabloid" },
      ],
    },
    {
      kind: "select",
      name: "mode",
      label: "Scaling",
      default: "fit",
      options: [
        { label: "Fit and centre (keep proportions)", value: "fit" },
        { label: "Stretch to fill", value: "stretch" },
      ],
    },
    { kind: "checkbox", name: "landscape", label: "Landscape orientation", default: false },
  ],
  actionLabel: "Resize pages",
  runningLabel: "Resizing…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await fixPageSize(
      files[0],
      String(values.size),
      values.mode as PageSizeMode,
      Boolean(values.landscape),
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages normalised to ${String(values.size).toUpperCase()}.`,
      message: "Page size fixed.",
    };
  },
});

export const PageDimensionsPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Measure pages",
  runningLabel: "Measuring…",
  execute: async ({ files, report }) => {
    report(50);
    const out = await describePageDimensions(files[0]);
    return {
      filename: `${files[0].name} dimensions`,
      description: `${out.pageCount} pages · ${out.items.length} distinct size ${out.items.length === 1 ? "run" : "runs"}.`,
      details: out.items,
      message: "Measurement complete.",
    };
  },
});

export const FlattenPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Flatten",
  runningLabel: "Flattening…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await flattenPdf(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.fields} form fields baked into the page content.`,
      message: `Flattened ${out.fields} fields.`,
    };
  },
});

export const RemoveAnnotationsPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages", hint: "Leave empty for every page." },
  actionLabel: "Remove annotations",
  runningLabel: "Removing…",
  execute: async ({ files, selection, report }) => {
    report(40);
    const out = await removeAnnotations(files[0], selection);
    return {
      blob: out.blob,
      filename: out.filename,
      description:
        out.removed === 0
          ? "No annotations found."
          : `${out.removed} annotations removed and purged from the file.`,
      message:
        out.removed === 0
          ? "Nothing to remove."
          : `Removed ${out.removed} annotations.`,
    };
  },
});

export const ChangeBackgroundPanel = createToolPanel({
  input: SINGLE_PDF,
  pageSelection: { label: "Pages", hint: "Leave empty for every page." },
  fields: [
    { kind: "color", name: "color", label: "Background colour", default: "#fffdf7" },
  ],
  actionLabel: "Change background",
  runningLabel: "Painting…",
  execute: async ({ files, selection, values, report }) => {
    report(40);
    const out = await changeBackground(files[0], selection, String(values.color));
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Background applied behind the content on ${out.pageCount} pages.`,
      message: "Background changed.",
    };
  },
});

export const RemoveBlankPagesPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "number",
      name: "threshold",
      label: "Ink threshold",
      default: 0.2,
      min: 0,
      max: 20,
      step: 0.1,
      hint: "Percent of non-white pixels below which a page counts as blank.",
    },
  ],
  actionLabel: "Remove blank pages",
  runningLabel: "Scanning…",
  execute: async ({ files, values, report }) => {
    report(30);
    const out = await removeBlankPages(files[0], Number(values.threshold) / 100);
    return {
      blob: out.blob,
      filename: out.filename,
      description:
        out.removed === 0
          ? "No blank pages detected."
          : `${out.removed} blank pages removed · ${out.pageCount} remaining.`,
      message:
        out.removed === 0
          ? "Nothing to remove."
          : `Removed ${out.removed} blank pages.`,
    };
  },
});

export const EditMetadataPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "text", name: "title", label: "Title", default: "" },
    { kind: "text", name: "author", label: "Author", default: "" },
    { kind: "text", name: "subject", label: "Subject", default: "" },
    {
      kind: "text",
      name: "keywords",
      label: "Keywords",
      default: "",
      hint: "Comma separated.",
    },
    { kind: "text", name: "creator", label: "Creator", default: "" },
    { kind: "text", name: "producer", label: "Producer", default: "" },
  ],
  actionLabel: "Save metadata",
  runningLabel: "Saving…",
  validate: ({ values }) =>
    Object.values(values).some((value) => String(value).trim())
      ? null
      : "Fill in at least one field.",
  execute: async ({ files, values, report }) => {
    report(40);
    const fields: MetadataFields = {
      title: String(values.title),
      author: String(values.author),
      subject: String(values.subject),
      keywords: String(values.keywords),
      creator: String(values.creator),
      producer: String(values.producer),
    };
    const out = await editMetadata(files[0], fields);
    return {
      blob: out.blob,
      filename: out.filename,
      description: "Only the fields you filled in were changed.",
      message: "Metadata saved.",
    };
  },
});

export const RemoveMetadataPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Remove metadata",
  runningLabel: "Removing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await removeMetadata(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: out.removedXmp
        ? "Info dictionary cleared and the XMP metadata packet removed."
        : "Info dictionary cleared. This file had no XMP packet.",
      message: "Metadata removed.",
    };
  },
});

export const TableOfContentsPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    { kind: "text", name: "title", label: "Heading", default: "Contents" },
    FONT_FIELD,
    { kind: "number", name: "titleSize", label: "Heading size", default: 22, min: 8, max: 72 },
    { kind: "number", name: "entrySize", label: "Entry size", default: 11, min: 6, max: 32 },
  ],
  actionLabel: "Build contents page",
  runningLabel: "Building…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await generateTableOfContents(files[0], {
      title: String(values.title),
      fontName: String(values.fontName),
      titleSize: Number(values.titleSize),
      entrySize: Number(values.entrySize),
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.entries} bookmarks listed. Page numbers account for the inserted pages.`,
      message: `Listed ${out.entries} bookmarks.`,
    };
  },
});
