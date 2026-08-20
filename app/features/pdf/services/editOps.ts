import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  type PDFObject,
} from "pdf-lib";
import { allPages, parsePageSelection } from "../../../lib/pages";
import { collectGarbage } from "./gc";
import {
  ensurePageContents,
  loadPdf,
  PAGE_SIZES,
  savePdf,
  type PdfSaveResult,
} from "./pdfCore";
import { parseHexColor } from "./textOverlay";

function selectedPages(doc: PDFDocument, selection: string): number[] {
  const total = doc.getPageCount();
  return selection.trim() ? parsePageSelection(selection, total) : allPages(total);
}

export interface CropOptions {
  selection: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Trim page edges by setting the crop box. The underlying content is kept, so
 * the crop is reversible. Use Redact to remove content outright.
 */
export async function cropPdf(
  file: File,
  options: CropOptions,
): Promise<PdfSaveResult & { cropped: number }> {
  const doc = await loadPdf(file);
  const pages = selectedPages(doc, options.selection);

  for (const pageNumber of pages) {
    const page = doc.getPage(pageNumber - 1);
    const box = page.getCropBox();
    const width = box.width - options.left - options.right;
    const height = box.height - options.top - options.bottom;
    if (width <= 0 || height <= 0) {
      throw new Error(
        `Those margins remove all of page ${pageNumber}. Reduce them and try again.`,
      );
    }
    page.setCropBox(
      box.x + options.left,
      box.y + options.bottom,
      width,
      height,
    );
  }

  const saved = await savePdf(doc, file.name, "-cropped");
  return { ...saved, cropped: pages.length };
}

export type PageSizeMode = "fit" | "stretch";

/** Rescale every page onto a uniform sheet size. */
export async function fixPageSize(
  file: File,
  sizeName: string,
  mode: PageSizeMode,
  landscape: boolean,
): Promise<PdfSaveResult> {
  const dimensions = PAGE_SIZES[sizeName];
  if (!dimensions) throw new Error(`Unknown page size: ${sizeName}`);
  const [portraitWidth, portraitHeight] = dimensions;
  const targetWidth = landscape ? portraitHeight : portraitWidth;
  const targetHeight = landscape ? portraitWidth : portraitHeight;

  const source = await loadPdf(file);
  ensurePageContents(source);
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(source.getPages());

  for (const page of embedded) {
    const sheet = out.addPage([targetWidth, targetHeight]);
    if (mode === "stretch") {
      sheet.drawPage(page, {
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight,
      });
      continue;
    }
    // Fit: preserve aspect ratio and centre the result.
    const scale = Math.min(
      targetWidth / page.width,
      targetHeight / page.height,
    );
    const width = page.width * scale;
    const height = page.height * scale;
    sheet.drawPage(page, {
      x: (targetWidth - width) / 2,
      y: (targetHeight - height) / 2,
      width,
      height,
    });
  }

  return savePdf(out, file.name, "-resized");
}

/** Bake interactive form fields into static page content. */
export async function flattenPdf(
  file: File,
): Promise<PdfSaveResult & { fields: number }> {
  const doc = await loadPdf(file);
  let fields = 0;
  try {
    const form = doc.getForm();
    fields = form.getFields().length;
    if (fields === 0) {
      throw new Error(
        "This PDF has no form fields to flatten. Its content is already static.",
      );
    }
    form.flatten();
  } catch (error) {
    if (error instanceof Error && /no form fields/i.test(error.message)) {
      throw error;
    }
    throw new Error(
      "Could not flatten this form. Some fields use features that pdf-lib cannot bake in.",
    );
  }
  const saved = await savePdf(doc, file.name, "-flattened");
  return { ...saved, fields };
}

export async function removeAnnotations(
  file: File,
  selection: string,
): Promise<PdfSaveResult & { removed: number }> {
  const doc = await loadPdf(file);
  const pages = selectedPages(doc, selection);

  let removed = 0;
  for (const pageNumber of pages) {
    const node = doc.getPage(pageNumber - 1).node;
    const annots = node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    removed += annots.size();
    node.delete(PDFName.of("Annots"));
  }
  // Drop the annotation objects themselves, not just the references.
  collectGarbage(doc);

  const saved = await savePdf(doc, file.name, "-no-annotations");
  return { ...saved, removed };
}

/**
 * Paint a solid colour behind existing content.
 *
 * pdf-lib always draws on top, so each page is re-composited onto a filled
 * sheet rather than drawn over.
 */
export async function changeBackground(
  file: File,
  selection: string,
  color: string,
): Promise<PdfSaveResult> {
  const source = await loadPdf(file);
  ensurePageContents(source);
  const targeted = new Set(selectedPages(source, selection));
  const fill = parseHexColor(color);

  const out = await PDFDocument.create();
  const embedded = await out.embedPages(source.getPages());

  embedded.forEach((page, index) => {
    const sheet = out.addPage([page.width, page.height]);
    if (targeted.has(index + 1)) {
      sheet.drawRectangle({
        x: 0,
        y: 0,
        width: page.width,
        height: page.height,
        color: fill,
      });
    }
    sheet.drawPage(page, { x: 0, y: 0 });
  });

  return savePdf(out, file.name, "-background");
}

export interface MetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export async function editMetadata(
  file: File,
  fields: MetadataFields,
): Promise<PdfSaveResult> {
  const doc = await loadPdf(file);
  if (fields.title) doc.setTitle(fields.title);
  if (fields.author) doc.setAuthor(fields.author);
  if (fields.subject) doc.setSubject(fields.subject);
  if (fields.keywords) {
    doc.setKeywords(
      fields.keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    );
  }
  if (fields.creator) doc.setCreator(fields.creator);
  if (fields.producer) doc.setProducer(fields.producer);
  doc.setModificationDate(new Date());
  return savePdf(doc, file.name, "-metadata");
}

/**
 * Clear document metadata, including the XMP packet.
 *
 * Setting the Info fields to empty is not enough: readers prefer the XMP
 * metadata stream, so a stale author or title would survive there.
 */
export async function removeMetadata(
  file: File,
): Promise<PdfSaveResult & { removedXmp: boolean }> {
  const doc = await loadPdf(file);

  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("");
  doc.setProducer("");

  const catalog = doc.catalog;
  const removedXmp = catalog.has(PDFName.of("Metadata"));
  if (removedXmp) catalog.delete(PDFName.of("Metadata"));

  // Strip the Info dictionary entries outright rather than blanking them.
  const info = doc.context.lookupMaybe(
    doc.context.trailerInfo.Info,
    PDFDict,
  );
  if (info) {
    for (const key of [
      "Title",
      "Author",
      "Subject",
      "Keywords",
      "Creator",
      "Producer",
    ]) {
      info.delete(PDFName.of(key));
    }
  }

  collectGarbage(doc);
  const saved = await savePdf(doc, file.name, "-no-metadata");
  return { ...saved, removedXmp };
}

export interface OutlineEntry {
  title: string;
  page: number;
  depth: number;
}

/** Read the existing bookmark tree, flattened with depth. */
export async function readOutline(file: File): Promise<OutlineEntry[]> {
  const doc = await loadPdf(file);
  const context = doc.context;
  const entries: OutlineEntry[] = [];

  const root = doc.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict);
  if (!root) return entries;

  // Page object reference -> 1-based page number, for resolving destinations.
  const pageNumberByRef = new Map<string, number>();
  doc.getPages().forEach((page, index) => {
    pageNumberByRef.set(page.ref.tag, index + 1);
  });

  const resolvePage = (node: PDFDict): number => {
    const direct = context.lookup(node.get(PDFName.of("Dest")));
    const action = context.lookupMaybe(node.get(PDFName.of("A")), PDFDict);
    const destination =
      direct instanceof PDFArray
        ? direct
        : action
          ? context.lookupMaybe(action.get(PDFName.of("D")), PDFArray)
          : undefined;
    if (!destination || destination.size() === 0) return 1;
    const tag = (destination.get(0) as { tag?: string }).tag;
    return (tag && pageNumberByRef.get(tag)) || 1;
  };

  const walk = (start: PDFObject | undefined, depth: number): void => {
    let current: PDFObject | undefined = start;
    // Malformed outlines can form a cycle; cap the traversal.
    for (let guard = 0; current && guard < 5000; guard += 1) {
      const node: PDFDict | undefined = context.lookupMaybe(current, PDFDict);
      if (!node) return;

      const title = context.lookup(node.get(PDFName.of("Title")));
      if (title instanceof PDFString) {
        entries.push({
          title: title.asString(),
          page: resolvePage(node),
          depth,
        });
      }

      const first = node.get(PDFName.of("First"));
      if (first) walk(first, depth + 1);
      current = node.get(PDFName.of("Next"));
    }
  };

  walk(root.get(PDFName.of("First")), 0);
  return entries;
}

/** Per-page size report, grouping runs of identical dimensions. */
export async function describePageDimensions(
  file: File,
): Promise<{ items: { label: string; value: string }[]; pageCount: number }> {
  const doc = await loadPdf(file);
  const sizes = doc.getPages().map((page) => {
    const { width, height } = page.getSize();
    return `${width.toFixed(1)} x ${height.toFixed(1)} pt`;
  });

  const items: { label: string; value: string }[] = [];
  let runStart = 0;
  for (let i = 1; i <= sizes.length; i += 1) {
    if (i < sizes.length && sizes[i] === sizes[runStart]) continue;
    const label =
      runStart === i - 1 ? `Page ${runStart + 1}` : `Pages ${runStart + 1}-${i}`;
    const [width, height] = sizes[runStart].split(" x ");
    const orientation =
      Number.parseFloat(width) > Number.parseFloat(height)
        ? "landscape"
        : "portrait";
    items.push({ label, value: `${sizes[runStart]} · ${orientation}` });
    runStart = i;
  }

  return { items, pageCount: sizes.length };
}

export interface TocOptions {
  title: string;
  fontName: string;
  titleSize: number;
  entrySize: number;
}

/** Prepend a table-of-contents page built from the document's bookmarks. */
export async function generateTableOfContents(
  file: File,
  options: TocOptions,
): Promise<PdfSaveResult & { entries: number }> {
  const entries = await readOutline(file);
  if (entries.length === 0) {
    throw new Error(
      "This PDF has no bookmarks to build a table of contents from.",
    );
  }

  const doc = await loadPdf(file);
  const font = await doc.embedFont(options.fontName);
  const first = doc.getPage(0);
  const { width, height } = first.getSize();

  const margin = 56;
  const lineHeight = options.entrySize * 1.9;
  const usable = height - margin * 2 - options.titleSize * 2;
  const perPage = Math.max(1, Math.floor(usable / lineHeight));
  const pageCount = Math.ceil(entries.length / perPage);

  // Build back-to-front so inserting at index 0 leaves them in order.
  for (let sheet = pageCount - 1; sheet >= 0; sheet -= 1) {
    const page = doc.insertPage(0, [width, height]);
    let cursor = height - margin;

    if (sheet === 0) {
      page.drawText(options.title, {
        x: margin,
        y: cursor - options.titleSize,
        size: options.titleSize,
        font,
      });
      cursor -= options.titleSize * 2;
    }

    const slice = entries.slice(sheet * perPage, (sheet + 1) * perPage);
    for (const entry of slice) {
      cursor -= lineHeight;
      const indent = margin + entry.depth * 16;
      // Page numbers shift by the TOC pages we are inserting.
      const target = String(entry.page + pageCount);
      const targetWidth = font.widthOfTextAtSize(target, options.entrySize);
      page.drawText(entry.title, {
        x: indent,
        y: cursor,
        size: options.entrySize,
        font,
      });
      page.drawText(target, {
        x: width - margin - targetWidth,
        y: cursor,
        size: options.entrySize,
        font,
      });
    }
  }

  const saved = await savePdf(doc, file.name, "-toc");
  return { ...saved, entries: entries.length };
}
