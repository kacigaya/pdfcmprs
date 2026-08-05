"use client";

import {
  adjustPdfColors,
  invertPdfColors,
  pdfToGreyscale,
  pdfToImages,
  scannerEffect,
  type RasterFormat,
  type RasterQuality,
} from "../../../features/pdf/services/rasterOps";
import { formatFileSize } from "../../../lib/files";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";
import type { OptionField } from "../OptionsForm";

const SINGLE_PDF: ToolInputSpec = {
  kind: "single",
  batch: true,
  label: "Drop your PDF here",
  previews: true,
};

const QUALITY_FIELD: OptionField = {
  kind: "select",
  name: "quality",
  label: "Quality",
  default: "high",
  options: [
    { label: "Standard (72 dpi)", value: "standard" },
    { label: "High (150 dpi)", value: "high" },
    { label: "Maximum (216 dpi)", value: "maximum" },
  ],
};

/** Rasterising replaces text with pixels — say so rather than surprise anyone. */
const RASTER_WARNING =
  "Pages are rasterised, so the output is no longer searchable text.";

export const PdfToImagePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "select",
      name: "format",
      label: "Format",
      default: "png",
      options: [
        { label: "PNG", value: "png" },
        { label: "JPG", value: "jpg" },
        { label: "WebP", value: "webp" },
        { label: "BMP", value: "bmp" },
        { label: "TIFF", value: "tiff" },
      ],
    },
    QUALITY_FIELD,
  ],
  actionLabel: "Render images",
  runningLabel: "Rendering…",
  execute: async ({ files, values, report }) => {
    const out = await pdfToImages(files[0], {
      format: values.format as RasterFormat,
      quality: values.quality as RasterQuality,
      report,
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: out.zipped
        ? `${out.pageCount} ${out.format} files packaged as ZIP · ${formatFileSize(out.blob.size)}.`
        : `One ${out.format} image · ${formatFileSize(out.blob.size)}.`,
      message: `Rendered ${out.pageCount} pages as ${out.format}.`,
    };
  },
});

export const PdfToCbzPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [QUALITY_FIELD],
  actionLabel: "Build CBZ",
  runningLabel: "Building…",
  execute: async ({ files, values, report }) => {
    const out = await pdfToImages(files[0], {
      format: "jpg",
      quality: values.quality as RasterQuality,
      archiveExtension: "cbz",
      report,
    });
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} JPG pages in a comic-book archive · ${formatFileSize(out.blob.size)}.`,
      message: `Packed ${out.pageCount} pages into a CBZ.`,
    };
  },
});

export const PdfToGreyscalePanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [QUALITY_FIELD],
  actionLabel: "Convert to greyscale",
  runningLabel: "Converting…",
  execute: async ({ files, values, report }) => {
    const out = await pdfToGreyscale(
      files[0],
      values.quality as RasterQuality,
      report,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages converted. ${RASTER_WARNING}`,
      message: "Greyscale conversion complete.",
    };
  },
});

export const InvertColorsPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [QUALITY_FIELD],
  actionLabel: "Invert colours",
  runningLabel: "Inverting…",
  execute: async ({ files, values, report }) => {
    const out = await invertPdfColors(
      files[0],
      values.quality as RasterQuality,
      report,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages inverted — handy for dark-mode reading. ${RASTER_WARNING}`,
      message: "Colours inverted.",
    };
  },
});

export const AdjustColorsPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "number",
      name: "brightness",
      label: "Brightness",
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
      hint: "1 leaves it unchanged.",
    },
    {
      kind: "number",
      name: "contrast",
      label: "Contrast",
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      kind: "number",
      name: "saturation",
      label: "Saturation",
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
      hint: "0 is fully grey.",
    },
    QUALITY_FIELD,
  ],
  actionLabel: "Adjust colours",
  runningLabel: "Adjusting…",
  validate: ({ values }) =>
    Number(values.brightness) === 1 &&
    Number(values.contrast) === 1 &&
    Number(values.saturation) === 1
      ? "Change at least one setting away from 1."
      : null,
  execute: async ({ files, values, report }) => {
    const out = await adjustPdfColors(
      files[0],
      {
        brightness: Number(values.brightness),
        contrast: Number(values.contrast),
        saturation: Number(values.saturation),
      },
      values.quality as RasterQuality,
      report,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages adjusted. ${RASTER_WARNING}`,
      message: "Colour adjustment complete.",
    };
  },
});

export const ScannerEffectPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "number",
      name: "strength",
      label: "Strength",
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      hint: "0 is untouched, 1 is a heavily worn photocopy.",
    },
    QUALITY_FIELD,
  ],
  actionLabel: "Apply scanner effect",
  runningLabel: "Scanning…",
  execute: async ({ files, values, report }) => {
    const out = await scannerEffect(
      files[0],
      Number(values.strength),
      values.quality as RasterQuality,
      report,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages given a photocopied look. ${RASTER_WARNING}`,
      message: "Scanner effect applied.",
    };
  },
});
