"use client";

import {
  addVisibleSignature,
  changeTextColor,
  deskewPdf,
  digitalSign,
  documentToPdf,
  extractImages,
  ghostscriptPdf,
  inspectSignatures,
  pdfForAi,
  pdfToDocx,
  pdfToMarkdown,
  rasterizeDocument,
  rotateCustom,
  timestampPdf,
} from "../../../features/pdf/services/advancedOps";
import {
  comparePdfs,
  createForm,
  editPdf,
  fillForm,
  runWorkflow,
  type EditorOperation,
  type FormFieldSpec,
} from "../../../features/pdf/services/interactiveOps";
import { reorderPages } from "../../../features/pdf/services/pageOps";
import {
  addAttachments,
  addPageLabels,
  editBookmarks,
  editLayers,
  extractAttachments,
  overlayPdfs,
  removeAttachments,
} from "../../../features/pdf/services/structureOps";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";

const PDF: ToolInputSpec = { kind: "single", batch: true, label: "Drop your PDF here", previews: true };
const QUALITY = {
  kind: "select" as const,
  name: "quality",
  label: "Quality",
  default: "high",
  options: [
    { label: "Standard", value: "standard" },
    { label: "High", value: "high" },
    { label: "Maximum", value: "maximum" },
  ],
};

export const DocumentToPdfPanel = createToolPanel({
  input: { kind: "single", batch: true, label: "Drop your document here", filter: (files) => Array.from(files) },
  actionLabel: "Convert to PDF",
  runningLabel: "Converting…",
  execute: async ({ files }) => ({ ...(await documentToPdf(files[0])), description: "Converted locally in your browser.", message: "Document converted to PDF." }),
});

export const PdfAPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "select", name: "level", label: "Conformance", default: "pdfa2", options: [{ label: "PDF/A-1b", value: "pdfa1" }, { label: "PDF/A-2b", value: "pdfa2" }, { label: "PDF/A-3b", value: "pdfa3" }] }],
  actionLabel: "Convert to PDF/A",
  runningLabel: "Converting…",
  execute: async ({ files, values }) => ({ ...(await ghostscriptPdf(files[0], values.level as "pdfa1" | "pdfa2" | "pdfa3")), message: "PDF/A conversion complete." }),
});

export const FontOutlinesPanel = createToolPanel({
  input: PDF,
  actionLabel: "Convert fonts to outlines",
  runningLabel: "Outlining…",
  execute: async ({ files }) => ({ ...(await ghostscriptPdf(files[0], "outlines")), message: "Fonts converted to outlines." }),
});

export const RasterizePanel = createToolPanel({
  input: PDF,
  fields: [QUALITY],
  actionLabel: "Rasterize PDF",
  runningLabel: "Rasterizing…",
  execute: async ({ files, values, report }) => ({ ...(await rasterizeDocument(files[0], values.quality as "high", report)), description: "All text and vectors were baked into page images.", message: "PDF rasterized." }),
});

export const DeskewPanel = createToolPanel({
  input: PDF,
  fields: [QUALITY],
  actionLabel: "Deskew PDF",
  runningLabel: "Deskewing…",
  execute: async ({ files, values, report }) => ({ ...(await deskewPdf(files[0], values.quality as "high", report)), description: "Pages were auto-straightened within a ±6° scan range and rasterized.", message: "PDF deskewed." }),
});

export const ChangeTextColorPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "color", name: "color", label: "Text colour", default: "#1d4ed8" }, QUALITY],
  actionLabel: "Change text colour",
  runningLabel: "Recolouring…",
  execute: async ({ files, values, report }) => ({ ...(await changeTextColor(files[0], String(values.color), values.quality as "high", report)), description: "Dark text was recoloured; pages were rasterized.", message: "Text colour changed." }),
});

export const CustomRotatePanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "number", name: "angle", label: "Angle in degrees", default: 5, min: -359, max: 359, step: 0.1 }],
  actionLabel: "Rotate pages",
  runningLabel: "Rotating…",
  validate: ({ values }) => Number(values.angle) === 0 ? "Choose a non-zero angle." : null,
  execute: async ({ files, values }) => ({ ...(await rotateCustom(files[0], Number(values.angle))), message: "Custom rotation complete." }),
});

export const ExtractImagesPanel = createToolPanel({
  input: PDF,
  actionLabel: "Extract images",
  runningLabel: "Extracting…",
  execute: async ({ files, report }) => { const out = await extractImages(files[0], report); return { ...out, description: `${out.count} embedded images extracted.`, message: "Images extracted." }; },
});

export const PdfToMarkdownPanel = createToolPanel({ input: PDF, actionLabel: "Export Markdown", runningLabel: "Extracting…", execute: async ({ files, report }) => ({ ...(await pdfToMarkdown(files[0], report)), message: "Markdown exported." }) });
export const PdfForAiPanel = createToolPanel({ input: PDF, actionLabel: "Prepare JSON", runningLabel: "Structuring…", execute: async ({ files, report }) => ({ ...(await pdfForAi(files[0], report)), message: "AI-ready JSON exported." }) });
export const PdfToDocxPanel = createToolPanel({ input: PDF, actionLabel: "Export DOCX", runningLabel: "Building…", execute: async ({ files, report }) => ({ ...(await pdfToDocx(files[0], report)), description: "Editable text exported as a Word document.", message: "DOCX exported." }) });

export const OrganizeDuplicatePanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "text", name: "order", label: "Page order", default: "1,2,2,3", placeholder: "1,2,2,3" }],
  actionLabel: "Apply page order",
  runningLabel: "Organizing…",
  execute: async ({ files, values }) => {
    const order = String(values.order).split(",").map((part) => Number(part.trim())).filter(Number.isInteger);
    return { ...(await reorderPages(files[0], order)), description: "Repeated page numbers create duplicates.", message: "Pages organized." };
  },
});

export const EditorPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "textarea", name: "operations", label: "Editor operations (JSON)", rows: 10, mono: true, default: '[{"type":"text","page":1,"x":72,"y":720,"text":"Hello","size":18,"color":"#1d4ed8"}]' }],
  actionLabel: "Apply edits",
  runningLabel: "Editing…",
  execute: async ({ files, values }) => ({ ...(await editPdf(files[0], JSON.parse(String(values.operations)) as EditorOperation[])), description: "Text, rectangles, and secure raster redactions are supported.", message: "PDF edited." }),
});

export const CreateFormPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "textarea", name: "fields", label: "Form fields (JSON)", rows: 10, mono: true, default: '[{"type":"text","name":"full_name","page":1,"x":72,"y":700,"width":220,"height":24}]' }],
  actionLabel: "Create form",
  runningLabel: "Creating…",
  execute: async ({ files, values }) => ({ ...(await createForm(files[0], JSON.parse(String(values.fields)) as FormFieldSpec[])), message: "Form fields created." }),
});

export const FillFormPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "textarea", name: "values", label: "Field values (JSON)", rows: 8, mono: true, default: '{"full_name":"Ada Lovelace"}' }],
  actionLabel: "Fill form",
  runningLabel: "Filling…",
  execute: async ({ files, values }) => ({ ...(await fillForm(files[0], JSON.parse(String(values.values)))), message: "Form filled." }),
});

export const ComparePanel = createToolPanel({
  input: { kind: "multiple", label: "Drop two PDFs here", minFiles: 2, previews: true },
  actionLabel: "Compare PDFs",
  runningLabel: "Comparing…",
  validate: ({ files }) => files.length === 2 ? null : "Add exactly two PDFs.",
  execute: async ({ files, report }) => { const out = await comparePdfs(files[0], files[1], report); return { ...out, description: `${out.changed} changed pages.`, message: "Comparison complete." }; },
});

export const WorkflowPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "textarea", name: "steps", label: "Workflow steps (JSON)", rows: 8, mono: true, default: '[{"tool":"compress","value":"balanced"}]' }],
  actionLabel: "Run workflow",
  runningLabel: "Running…",
  execute: async ({ files, values, report }) => { const out = await runWorkflow(files[0], JSON.parse(String(values.steps)), report); return { ...out, description: `${out.steps} steps completed.`, message: "Workflow complete." }; },
});

export const AddAttachmentsPanel = createToolPanel({
  input: { kind: "multiple", label: "Drop a PDF first, then attachment files", minFiles: 2, filter: (files) => Array.from(files) },
  actionLabel: "Attach files",
  runningLabel: "Attaching…",
  validate: ({ files }) => /\.pdf$/i.test(files[0].name) ? null : "The first file must be a PDF.",
  execute: async ({ files }) => ({ ...(await addAttachments(files[0], files.slice(1))), message: "Attachments added." }),
});
export const ExtractAttachmentsPanel = createToolPanel({ input: PDF, actionLabel: "Extract attachments", runningLabel: "Extracting…", execute: async ({ files }) => { const out = await extractAttachments(files[0]); return { ...out, description: `${out.count} attachments extracted.`, message: "Attachments extracted." }; } });
export const RemoveAttachmentsPanel = createToolPanel({ input: PDF, actionLabel: "Remove attachments", runningLabel: "Removing…", execute: async ({ files }) => ({ ...(await removeAttachments(files[0])), message: "Attachments removed." }) });

export const BookmarksPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "textarea", name: "json", label: "Bookmark JSON (leave blank to export)", rows: 10, mono: true, default: "" }],
  actionLabel: "Export or apply bookmarks",
  runningLabel: "Processing…",
  execute: async ({ files, values }) => ({ ...(await editBookmarks(files[0], String(values.json))), message: values.json ? "Bookmarks updated." : "Bookmarks exported." }),
});

export const PageLabelsPanel = createToolPanel({
  input: PDF,
  fields: [
    { kind: "select", name: "style", label: "Style", default: "decimal", options: [{ label: "1, 2, 3", value: "decimal" }, { label: "I, II, III", value: "romanUpper" }, { label: "i, ii, iii", value: "romanLower" }, { label: "A, B, C", value: "lettersUpper" }] },
    { kind: "text", name: "prefix", label: "Prefix", default: "" },
    { kind: "number", name: "start", label: "Start value", default: 1, min: 1, step: 1 },
  ],
  actionLabel: "Add page labels",
  runningLabel: "Labeling…",
  execute: async ({ files, values }) => ({ ...(await addPageLabels(files[0], String(values.style), String(values.prefix), Number(values.start))), message: "Page labels added." }),
});

export const OverlayPanel = createToolPanel({
  input: { kind: "multiple", label: "Drop base PDF, then overlay PDF", minFiles: 2, previews: true },
  fields: [{ kind: "select", name: "position", label: "Position", default: "over", options: [{ label: "Over content", value: "over" }, { label: "Under content", value: "under" }] }],
  actionLabel: "Overlay PDFs",
  runningLabel: "Overlaying…",
  validate: ({ files }) => files.length === 2 ? null : "Add exactly two PDFs.",
  execute: async ({ files, values }) => ({ ...(await overlayPdfs(files[0], files[1], values.position === "over")), message: "PDFs overlaid." }),
});

export const LayersPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "text", name: "from", label: "Existing layer (blank to list)", default: "" }, { kind: "text", name: "to", label: "New layer name", default: "" }],
  actionLabel: "List or rename layers",
  runningLabel: "Processing…",
  execute: async ({ files, values }) => ({ ...(await editLayers(files[0], String(values.from), String(values.to))), message: values.from ? "Layer renamed." : "Layers exported." }),
});

export const VisibleSignaturePanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "text", name: "text", label: "Signature text", default: "Signed" }, { kind: "number", name: "page", label: "Page", default: 1, min: 1, step: 1 }],
  actionLabel: "Add signature",
  runningLabel: "Signing…",
  execute: async ({ files, values }) => ({ ...(await addVisibleSignature(files[0], String(values.text), Number(values.page))), message: "Visible signature added." }),
});

export const DigitalSignaturePanel = createToolPanel({
  input: { kind: "multiple", label: "Drop a PDF and a PKCS#12 certificate", minFiles: 2, accept: ".pdf,.p12,.pfx", filter: (files) => Array.from(files).filter((file) => /\.(pdf|p12|pfx)$/i.test(file.name)) },
  fields: [{ kind: "password", name: "password", label: "Certificate password", default: "" }],
  actionLabel: "Digitally sign",
  runningLabel: "Signing…",
  execute: async ({ files, values }) => {
    const pdf = files.find((file) => /\.pdf$/i.test(file.name));
    const cert = files.find((file) => /\.(p12|pfx)$/i.test(file.name));
    if (!pdf || !cert) throw new Error("Add one PDF and one .p12/.pfx certificate.");
    return { ...(await digitalSign(pdf, cert, String(values.password))), message: "PDF digitally signed." };
  },
});

export const ValidateSignaturePanel = createToolPanel({ input: PDF, actionLabel: "Validate signatures", runningLabel: "Inspecting…", execute: async ({ files }) => { const out = await inspectSignatures(files[0]); return { ...out, description: `${out.count} signature dictionaries found and checked for byte-range integrity.`, message: "Signature inspection complete." }; } });

export const TimestampPanel = createToolPanel({
  input: PDF,
  fields: [{ kind: "text", name: "url", label: "RFC 3161 TSA URL", default: "https://freetsa.org/tsr" }],
  actionLabel: "Timestamp PDF",
  runningLabel: "Timestamping…",
  execute: async ({ files, values }) => ({ ...(await timestampPdf(files[0], String(values.url))), message: "Trusted timestamp applied." }),
});
