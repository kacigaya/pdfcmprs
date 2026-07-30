"use client";

import {
  textFileToPdf,
  type TextLayoutOptions,
  type TextSourceFormat,
} from "../../../features/pdf/services/textImport";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";
import type { OptionField } from "../OptionsForm";

/** Accept anything — these formats are all plain text under the hood. */
const TEXT_INPUT: ToolInputSpec = {
  kind: "single",
  label: "Drop your file here",
  accept: ".txt,.md,.markdown,.json,.xml,.csv,.tsv,.eml,text/*",
  chooseLabel: "Select file",
  filter: (files) => Array.from(files),
};

const LAYOUT_FIELDS: ReadonlyArray<OptionField> = [
  {
    kind: "select",
    name: "pageSize",
    label: "Page size",
    default: "a4",
    options: [
      { label: "A4", value: "a4" },
      { label: "A3", value: "a3" },
      { label: "A5", value: "a5" },
      { label: "US Letter", value: "letter" },
      { label: "US Legal", value: "legal" },
    ],
  },
  { kind: "checkbox", name: "landscape", label: "Landscape", default: false },
  { kind: "number", name: "fontSize", label: "Font size", default: 11, min: 5, max: 36 },
  {
    kind: "number",
    name: "lineHeight",
    label: "Line spacing",
    default: 1.45,
    min: 1,
    max: 3,
    step: 0.05,
  },
  { kind: "number", name: "margin", label: "Margin (pt)", default: 56, min: 0, max: 200 },
  {
    kind: "checkbox",
    name: "monospace",
    label: "Monospaced font",
    default: false,
  },
];

function layoutFrom(values: Record<string, unknown>): TextLayoutOptions {
  return {
    pageSize: String(values.pageSize),
    landscape: Boolean(values.landscape),
    margin: Number(values.margin),
    fontSize: Number(values.fontSize),
    lineHeight: Number(values.lineHeight),
    monospace: Boolean(values.monospace),
  };
}

/**
 * One panel behind every text-ish source format. The registry sets
 * `preset.sourceFormat`, so each alias slug reuses this without extra code.
 */
export const TextToPdfPanel = createToolPanel({
  input: TEXT_INPUT,
  fields: [
    {
      kind: "select",
      name: "sourceFormat",
      label: "Source format",
      default: "text",
      options: [
        { label: "Plain text", value: "text" },
        { label: "Markdown", value: "markdown" },
        { label: "JSON", value: "json" },
        { label: "XML", value: "xml" },
        { label: "CSV", value: "csv" },
        { label: "Email", value: "email" },
      ],
    },
    ...LAYOUT_FIELDS,
  ],
  actionLabel: "Create PDF",
  runningLabel: "Converting…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await textFileToPdf(
      files[0],
      values.sourceFormat as TextSourceFormat,
      layoutFrom(values),
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `${out.pageCount} pages laid out from ${files[0].name}.`,
      message: `Created a ${out.pageCount}-page PDF.`,
    };
  },
});
