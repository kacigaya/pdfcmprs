import type { ComponentType } from "react";
import type { ToolRun } from "./hooks/useToolRun";

export type ToolCategory =
  | "organize"
  | "edit"
  | "automate"
  | "to-pdf"
  | "from-pdf"
  | "secure";

/**
 * Which processing engine a tool needs. Drives the lazy WASM loader and lets
 * the registry test assert nothing references an engine that does not exist.
 */
export type EngineId =
  | "pdf-lib"
  | "pdfjs"
  | "qpdf"
  | "mupdf"
  | "ghostscript"
  | "cpdf"
  | "libreoffice"
  | "tesseract"
  | "vips"
  | "pdfkit"
  | "opencv"
  | "native";

export const ENGINE_IDS: ReadonlyArray<EngineId> = [
  "pdf-lib",
  "pdfjs",
  "qpdf",
  "mupdf",
  "ghostscript",
  "cpdf",
  "libreoffice",
  "tesseract",
  "vips",
  "pdfkit",
  "opencv",
  "native",
];

export interface ToolPanelProps {
  tool: ToolDefinition;
  run: ToolRun;
}

export interface ToolDefinition {
  /** URL segment: "rotate-pdf" -> /rotate-pdf */
  slug: string;
  title: string;
  category: ToolCategory;
  /** Shown on the catalog card and used as the page <meta description>. */
  summary: string;
  /** Extra search terms for the catalog filter. */
  keywords: string[];
  engine: EngineId;
  /** How alias slugs reuse one panel, e.g. { format: "jpg" }. */
  preset?: Record<string, unknown>;
  load: () => Promise<{ default: ComponentType<ToolPanelProps> }>;
}

export interface CategoryDefinition {
  id: ToolCategory;
  label: string;
  summary: string;
}

export const CATEGORIES: ReadonlyArray<CategoryDefinition> = [
  {
    id: "organize",
    label: "Organize & Manage",
    summary: "Reorder, split, merge, and restructure pages.",
  },
  {
    id: "edit",
    label: "Edit & Modify",
    summary: "Stamp, annotate, crop, and rewrite page content.",
  },
  {
    id: "secure",
    label: "Secure & Optimize",
    summary: "Compress, encrypt, repair, sign, and sanitize.",
  },
  {
    id: "to-pdf",
    label: "Convert to PDF",
    summary: "Turn images, documents, and ebooks into PDFs.",
  },
  {
    id: "from-pdf",
    label: "Convert from PDF",
    summary: "Export PDFs as images, text, or structured data.",
  },
  {
    id: "automate",
    label: "Automate",
    summary: "Chain tools into a repeatable pipeline.",
  },
];

export const TOOLS: ReadonlyArray<ToolDefinition> = [
  {
    slug: "compress-pdf",
    title: "Compress PDF",
    category: "secure",
    summary:
      "Shrink a PDF by rewriting it with object streams, leaving images and layout untouched.",
    keywords: ["compress", "shrink", "reduce", "size", "optimize"],
    engine: "pdf-lib",
    load: () => import("../../components/pdf/panels/CompressPanel"),
  },
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    category: "organize",
    summary: "Combine several PDFs into a single file, in the order you choose.",
    keywords: ["merge", "combine", "join", "concat"],
    engine: "pdf-lib",
    load: () => import("../../components/pdf/panels/MergePanel"),
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    category: "organize",
    summary: "Pull specific pages or ranges out of a PDF into a new document.",
    keywords: ["split", "extract", "pages", "range", "separate"],
    engine: "pdf-lib",
    load: () => import("../../components/pdf/panels/SplitPanel"),
  },
  {
    slug: "view-metadata",
    title: "View Metadata",
    category: "organize",
    summary:
      "Inspect page count, dimensions, PDF version, and document metadata.",
    keywords: ["inspect", "metadata", "info", "properties", "details"],
    engine: "pdfjs",
    load: () => import("../../components/pdf/panels/InspectPanel"),
  },
  {
    slug: "pdf-to-text",
    title: "PDF to Text",
    category: "from-pdf",
    summary: "Extract the selectable text from a PDF into a plain .txt file.",
    keywords: ["text", "extract", "txt", "content", "copy"],
    engine: "pdfjs",
    load: () => import("../../components/pdf/panels/ExtractTextPanel"),
  },
  {
    slug: "image-to-pdf",
    title: "Image to PDF",
    category: "to-pdf",
    summary: "Bind JPG, PNG, or WebP images into a single PDF document.",
    keywords: ["image", "jpg", "jpeg", "png", "webp", "photo", "convert"],
    engine: "pdf-lib",
    load: () => import("../../components/pdf/panels/ImagesToPdfPanel"),
  },
  {
    slug: "pdf-to-image",
    title: "PDF to Image",
    category: "from-pdf",
    summary: "Render every page of a PDF as a PNG or JPG image.",
    keywords: ["image", "png", "jpg", "jpeg", "render", "export", "convert"],
    engine: "pdfjs",
    load: () => import("../../components/pdf/panels/PdfToImagesPanel"),
  },
];

const TOOLS_BY_SLUG = new Map(TOOLS.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS_BY_SLUG.get(slug);
}

export function toolsInCategory(
  category: ToolCategory,
): ReadonlyArray<ToolDefinition> {
  return TOOLS.filter((tool) => tool.category === category);
}
