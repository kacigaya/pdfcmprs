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

/** Panels grouped by batch share a chunk — one lazy load covers the group. */
const organizePanel = (
  name: keyof typeof import("../../components/pdf/panels/organizePanels"),
) => {
  return async () => {
    const panels = await import("../../components/pdf/panels/organizePanels");
    return { default: panels[name] };
  };
};

const securePanel = (
  name: keyof typeof import("../../components/pdf/panels/securePanels"),
) => {
  return async () => {
    const panels = await import("../../components/pdf/panels/securePanels");
    return { default: panels[name] };
  };
};

const editPanel = (
  name: keyof typeof import("../../components/pdf/panels/editPanels"),
) => {
  return async () => {
    const panels = await import("../../components/pdf/panels/editPanels");
    return { default: panels[name] };
  };
};

const rasterPanel = (
  name: keyof typeof import("../../components/pdf/panels/rasterPanels"),
) => {
  return async () => {
    const panels = await import("../../components/pdf/panels/rasterPanels");
    return { default: panels[name] };
  };
};

const textPanel = (
  name: keyof typeof import("../../components/pdf/panels/textPanels"),
) => {
  return async () => {
    const panels = await import("../../components/pdf/panels/textPanels");
    return { default: panels[name] };
  };
};

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
    slug: "text-to-pdf",
    title: "Text to PDF",
    category: "to-pdf",
    summary: "Lay a plain text file out as a paginated PDF with word wrapping.",
    keywords: ["text", "txt", "plain", "convert", "typeset"],
    engine: "pdf-lib",
    preset: { sourceFormat: "text" },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "markdown-to-pdf",
    title: "Markdown to PDF",
    category: "to-pdf",
    summary:
      "Render Markdown as a PDF. Headings and lists are formatted; other syntax is flattened.",
    keywords: ["markdown", "md", "readme", "convert", "notes"],
    engine: "pdf-lib",
    preset: { sourceFormat: "markdown" },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "json-to-pdf",
    title: "JSON to PDF",
    category: "to-pdf",
    summary: "Pretty-print a JSON file into a monospaced PDF.",
    keywords: ["json", "data", "pretty", "convert", "api"],
    engine: "pdf-lib",
    preset: { sourceFormat: "json", monospace: true },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "xml-to-pdf",
    title: "XML to PDF",
    category: "to-pdf",
    summary: "Lay an XML document out as a monospaced PDF.",
    keywords: ["xml", "markup", "data", "convert", "feed"],
    engine: "pdf-lib",
    preset: { sourceFormat: "xml", monospace: true },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "csv-to-pdf",
    title: "CSV to PDF",
    category: "to-pdf",
    summary:
      "Turn comma-separated rows into a PDF table with the header row in bold.",
    keywords: ["csv", "spreadsheet", "table", "rows", "convert"],
    engine: "pdf-lib",
    preset: { sourceFormat: "csv", monospace: true },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "email-to-pdf",
    title: "Email to PDF",
    category: "to-pdf",
    summary: "Convert a saved .eml message, headers first, into a PDF.",
    keywords: ["email", "eml", "message", "mail", "archive", "convert"],
    engine: "pdf-lib",
    preset: { sourceFormat: "email" },
    load: textPanel("TextToPdfPanel"),
  },
  {
    slug: "pdf-to-image",
    title: "PDF to Image",
    category: "from-pdf",
    summary:
      "Render every page as PNG, JPG, WebP, BMP, or TIFF. Multi-page files download as a ZIP.",
    keywords: ["image", "png", "jpg", "jpeg", "render", "export", "convert"],
    engine: "pdfjs",
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-png",
    title: "PDF to PNG",
    category: "from-pdf",
    summary: "Render every page as a lossless PNG image.",
    keywords: ["png", "image", "lossless", "render", "export"],
    engine: "pdfjs",
    preset: { format: "png" },
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    category: "from-pdf",
    summary: "Render every page as a compact JPG image.",
    keywords: ["jpg", "jpeg", "image", "photo", "render", "export"],
    engine: "pdfjs",
    preset: { format: "jpg" },
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-webp",
    title: "PDF to WebP",
    category: "from-pdf",
    summary: "Render every page as WebP, smaller than PNG at similar quality.",
    keywords: ["webp", "image", "web", "render", "export", "small"],
    engine: "pdfjs",
    preset: { format: "webp" },
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-bmp",
    title: "PDF to BMP",
    category: "from-pdf",
    summary: "Render every page as an uncompressed 24-bit bitmap.",
    keywords: ["bmp", "bitmap", "image", "uncompressed", "render"],
    engine: "pdfjs",
    preset: { format: "bmp" },
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-tiff",
    title: "PDF to TIFF",
    category: "from-pdf",
    summary: "Render every page as TIFF, the archival and print standard.",
    keywords: ["tiff", "tif", "image", "archive", "print", "render"],
    engine: "pdfjs",
    preset: { format: "tiff" },
    load: rasterPanel("PdfToImagePanel"),
  },
  {
    slug: "pdf-to-cbz",
    title: "PDF to CBZ",
    category: "from-pdf",
    summary: "Package the pages as a CBZ comic-book archive.",
    keywords: ["cbz", "comic", "archive", "manga", "reader", "zip"],
    engine: "pdfjs",
    load: rasterPanel("PdfToCbzPanel"),
  },
  {
    slug: "pdf-to-greyscale",
    title: "PDF to Greyscale",
    category: "from-pdf",
    summary:
      "Strip all colour for cheaper printing. Pages are rasterised in the process.",
    keywords: ["greyscale", "grayscale", "black and white", "mono", "print"],
    engine: "pdfjs",
    load: rasterPanel("PdfToGreyscalePanel"),
  },
  {
    slug: "invert-colors",
    title: "Invert Colors",
    category: "edit",
    summary:
      "Flip light and dark for comfortable night reading. Pages are rasterised.",
    keywords: ["invert", "negative", "dark mode", "night", "colours"],
    engine: "pdfjs",
    load: rasterPanel("InvertColorsPanel"),
  },
  {
    slug: "adjust-colors",
    title: "Adjust Colors",
    category: "edit",
    summary:
      "Tune brightness, contrast, and saturation. Pages are rasterised.",
    keywords: ["colours", "brightness", "contrast", "saturation", "tune"],
    engine: "pdfjs",
    load: rasterPanel("AdjustColorsPanel"),
  },
  {
    slug: "scanner-effect",
    title: "Scanner Effect",
    category: "edit",
    summary:
      "Make a clean digital file look photocopied. Pages are rasterised.",
    keywords: ["scanner", "scan", "photocopy", "noise", "aged", "fax"],
    engine: "pdfjs",
    load: rasterPanel("ScannerEffectPanel"),
  },

  /* ------------------------------------------------ organize & manage */
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    category: "organize",
    summary:
      "Turn selected pages by 90°, 180°, or 270° without touching their content.",
    keywords: ["rotate", "turn", "orientation", "landscape", "portrait"],
    engine: "pdf-lib",
    load: organizePanel("RotatePanel"),
  },
  {
    slug: "delete-pages",
    title: "Delete Pages",
    category: "organize",
    summary: "Remove the pages you select and keep everything else intact.",
    keywords: ["delete", "remove", "drop", "pages", "erase"],
    engine: "pdf-lib",
    load: organizePanel("DeletePagesPanel"),
  },
  {
    slug: "extract-pages",
    title: "Extract Pages",
    category: "organize",
    summary: "Copy the pages you select into a brand new PDF.",
    keywords: ["extract", "pull", "copy", "pages", "subset"],
    engine: "pdf-lib",
    load: organizePanel("ExtractPagesPanel"),
  },
  {
    slug: "reverse-pages",
    title: "Reverse Pages",
    category: "organize",
    summary: "Flip the page order so the document reads last page first.",
    keywords: ["reverse", "flip", "invert", "order", "backwards"],
    engine: "pdf-lib",
    load: organizePanel("ReversePagesPanel"),
  },
  {
    slug: "add-blank-page",
    title: "Add Blank Page",
    category: "organize",
    summary:
      "Insert blank pages at the start, the end, after a page, or between every page.",
    keywords: ["blank", "insert", "empty", "add", "spacer"],
    engine: "pdf-lib",
    load: organizePanel("AddBlankPagePanel"),
  },
  {
    slug: "alternate-and-mix",
    title: "Alternate & Mix",
    category: "organize",
    summary:
      "Interleave two PDFs page by page — ideal for pairing front and back scans.",
    keywords: ["alternate", "mix", "interleave", "zip", "collate", "scan"],
    engine: "pdf-lib",
    load: organizePanel("AlternateMixPanel"),
  },
  {
    slug: "combine-to-single-page",
    title: "Combine to Single Page",
    category: "organize",
    summary: "Stack every page onto one long or one wide sheet.",
    keywords: ["combine", "single", "stack", "one page", "long"],
    engine: "pdf-lib",
    load: organizePanel("CombineToSinglePagePanel"),
  },
  {
    slug: "divide-pages",
    title: "Divide Pages",
    category: "organize",
    summary:
      "Split each page into a grid of smaller pages — two-up scans back into singles.",
    keywords: ["divide", "split", "grid", "cut", "halve", "two up"],
    engine: "pdf-lib",
    load: organizePanel("DividePagesPanel"),
  },
  {
    slug: "pdfs-to-zip",
    title: "PDFs to ZIP",
    category: "organize",
    summary: "Bundle several PDFs into one ZIP archive without re-encoding them.",
    keywords: ["zip", "archive", "bundle", "package", "download"],
    engine: "native",
    load: organizePanel("PdfsToZipPanel"),
  },
  {
    slug: "n-up-pdf",
    title: "N-Up PDF",
    category: "organize",
    summary:
      "Place several pages on each sheet in a grid — saves paper when printing.",
    keywords: ["n-up", "nup", "2up", "grid", "impose", "print", "paper"],
    engine: "pdf-lib",
    load: organizePanel("NUpPanel"),
  },
  {
    slug: "pdf-booklet",
    title: "PDF Booklet",
    category: "organize",
    summary:
      "Impose pages two-up in saddle-stitch order, ready to print double-sided and fold.",
    keywords: ["booklet", "saddle", "stitch", "fold", "impose", "print", "zine"],
    engine: "pdf-lib",
    load: organizePanel("BookletPanel"),
  },
  {
    slug: "posterize-pdf",
    title: "Posterize PDF",
    category: "organize",
    summary:
      "Split each page across a grid of sheets, with overlap for taping them together.",
    keywords: ["poster", "posterize", "tile", "enlarge", "wall", "split"],
    engine: "pdf-lib",
    load: organizePanel("PosterizePanel"),
  },

  /* ------------------------------------------------- secure & optimize */
  {
    slug: "encrypt-pdf",
    title: "Encrypt PDF",
    category: "secure",
    summary:
      "Lock a PDF with a password using AES-256, AES-128, or legacy RC4-40.",
    keywords: ["encrypt", "password", "protect", "lock", "secure", "aes"],
    engine: "qpdf",
    load: securePanel("EncryptPanel"),
  },
  {
    slug: "decrypt-pdf",
    title: "Decrypt PDF",
    category: "secure",
    summary: "Remove a known password so the PDF opens without one.",
    keywords: ["decrypt", "unlock", "password", "remove", "open"],
    engine: "qpdf",
    load: securePanel("DecryptPanel"),
  },
  {
    slug: "change-permissions",
    title: "Change Permissions",
    category: "secure",
    summary:
      "Control printing, copying, editing, and screen-reader access with an owner password.",
    keywords: ["permissions", "restrict", "printing", "copying", "owner"],
    engine: "qpdf",
    load: securePanel("PermissionsPanel"),
  },
  {
    slug: "repair-pdf",
    title: "Repair PDF",
    category: "secure",
    summary:
      "Rebuild a damaged cross-reference table so broken files open again.",
    keywords: ["repair", "fix", "recover", "damaged", "corrupt", "broken"],
    engine: "mupdf",
    load: securePanel("RepairPanel"),
  },
  {
    slug: "linearize-pdf",
    title: "Linearize PDF",
    category: "secure",
    summary:
      "Reorder the file for fast web view so the first page renders before the rest downloads.",
    keywords: ["linearize", "optimize", "web", "fast", "stream"],
    engine: "qpdf",
    load: securePanel("LinearizePanel"),
  },
  {
    slug: "remove-restrictions",
    title: "Remove Restrictions",
    category: "secure",
    summary:
      "Lift printing, copying, and editing limits from a PDF that is not password-encrypted.",
    keywords: ["restrictions", "unlock", "permissions", "remove", "owner"],
    engine: "qpdf",
    load: securePanel("RemoveRestrictionsPanel"),
  },
  {
    slug: "sanitize-pdf",
    title: "Sanitize PDF",
    category: "secure",
    summary:
      "Strip JavaScript, auto-run actions, launch actions, and embedded attachments.",
    keywords: ["sanitize", "clean", "javascript", "malware", "strip", "safe"],
    engine: "pdf-lib",
    load: securePanel("SanitizePanel"),
  },
  {
    slug: "edit-metadata",
    title: "Edit Metadata",
    category: "secure",
    summary: "Set the title, author, subject, keywords, creator, and producer.",
    keywords: ["metadata", "title", "author", "properties", "edit", "info"],
    engine: "pdf-lib",
    load: editPanel("EditMetadataPanel"),
  },
  {
    slug: "remove-metadata",
    title: "Remove Metadata",
    category: "secure",
    summary:
      "Clear the document info dictionary and the XMP packet that readers prefer.",
    keywords: ["metadata", "strip", "privacy", "anonymize", "xmp", "clean"],
    engine: "pdf-lib",
    load: editPanel("RemoveMetadataPanel"),
  },
  {
    slug: "fix-page-size",
    title: "Fix Page Size",
    category: "secure",
    summary: "Rescale every page onto one uniform sheet size.",
    keywords: ["page size", "a4", "letter", "resize", "uniform", "normalize"],
    engine: "pdf-lib",
    load: editPanel("FixPageSizePanel"),
  },
  {
    slug: "page-dimensions",
    title: "Page Dimensions",
    category: "secure",
    summary: "Report the size and orientation of every page, grouped into runs.",
    keywords: ["dimensions", "size", "measure", "orientation", "points"],
    engine: "pdf-lib",
    load: editPanel("PageDimensionsPanel"),
  },

  /* --------------------------------------------------- edit & modify */
  {
    slug: "add-page-numbers",
    title: "Add Page Numbers",
    category: "edit",
    summary:
      "Stamp page numbers with a custom format, position, font, and starting value.",
    keywords: ["page numbers", "pagination", "numbering", "folio"],
    engine: "pdf-lib",
    load: editPanel("PageNumbersPanel"),
  },
  {
    slug: "bates-numbering",
    title: "Bates Numbering",
    category: "edit",
    summary:
      "Apply sequential fixed-width legal stamps with a prefix, suffix, and increment.",
    keywords: ["bates", "legal", "discovery", "sequential", "numbering"],
    engine: "pdf-lib",
    load: editPanel("BatesPanel"),
  },
  {
    slug: "add-watermark",
    title: "Add Watermark",
    category: "edit",
    summary: "Overlay rotated, semi-transparent text across the pages.",
    keywords: ["watermark", "confidential", "draft", "overlay", "stamp"],
    engine: "pdf-lib",
    load: editPanel("WatermarkPanel"),
  },
  {
    slug: "header-and-footer",
    title: "Header & Footer",
    category: "edit",
    summary:
      "Add running headers and footers with placeholders for page numbers and filename.",
    keywords: ["header", "footer", "running", "title", "margin"],
    engine: "pdf-lib",
    load: editPanel("HeaderFooterPanel"),
  },
  {
    slug: "add-stamps",
    title: "Add Stamps",
    category: "edit",
    summary: "Place a text stamp such as APPROVED or DRAFT at any corner.",
    keywords: ["stamp", "approved", "draft", "mark", "annotate"],
    engine: "pdf-lib",
    load: editPanel("StampsPanel"),
  },
  {
    slug: "crop-pdf",
    title: "Crop PDF",
    category: "edit",
    summary: "Trim the page edges by adjusting the crop box.",
    keywords: ["crop", "trim", "margins", "cut", "edges"],
    engine: "pdf-lib",
    load: editPanel("CropPanel"),
  },
  {
    slug: "flatten-pdf",
    title: "Flatten PDF",
    category: "edit",
    summary: "Bake interactive form fields into static, non-editable content.",
    keywords: ["flatten", "form", "fields", "static", "lock"],
    engine: "pdf-lib",
    load: editPanel("FlattenPanel"),
  },
  {
    slug: "remove-annotations",
    title: "Remove Annotations",
    category: "edit",
    summary:
      "Strip comments, highlights, and links, purging the objects from the file.",
    keywords: ["annotations", "comments", "highlights", "links", "remove"],
    engine: "pdf-lib",
    load: editPanel("RemoveAnnotationsPanel"),
  },
  {
    slug: "remove-blank-pages",
    title: "Remove Blank Pages",
    category: "edit",
    summary:
      "Detect and drop pages with almost no ink — tuned for scanner speckle.",
    keywords: ["blank", "empty", "remove", "scan", "clean"],
    engine: "pdfjs",
    load: editPanel("RemoveBlankPagesPanel"),
  },
  {
    slug: "change-background",
    title: "Change Background",
    category: "edit",
    summary: "Paint a solid colour behind the existing page content.",
    keywords: ["background", "colour", "color", "fill", "paper", "tint"],
    engine: "pdf-lib",
    load: editPanel("ChangeBackgroundPanel"),
  },
  {
    slug: "table-of-contents",
    title: "Table of Contents",
    category: "edit",
    summary: "Build a contents page from the document's existing bookmarks.",
    keywords: ["contents", "toc", "index", "bookmarks", "outline"],
    engine: "pdf-lib",
    load: editPanel("TableOfContentsPanel"),
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
