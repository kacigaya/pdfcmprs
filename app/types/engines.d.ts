/**
 * Type declarations for engines loaded by URL from /wasm/ (copied out of
 * node_modules by scripts/copy-assets.ts) and for coherentpdf, which ships
 * js_of_ocaml output with no bundled types.
 */

declare module "coherentpdf" {
  /** Opaque handle to a document held inside the cpdf runtime. */
  export type Pdf = number;
  /** Opaque handle to a page range. */
  export type Range = number;

  export function fromMemory(data: Uint8Array, password: string): Pdf;
  export function toMemory(
    pdf: Pdf,
    linearize: boolean,
    makeId: boolean,
  ): Uint8Array;
  export function deletePdf(pdf: Pdf): void;
  export function pages(pdf: Pdf): number;

  export function all(pdf: Pdf): Range;
  export function range(from: number, to: number): Range;

  /** N-up / booklet imposition. */
  export function impose(
    pdf: Pdf,
    x: number,
    y: number,
    fit: boolean,
    columns: boolean,
    rtl: boolean,
    btt: boolean,
    center: boolean,
    margin: number,
    spacing: number,
    linewidth: number,
  ): void;

  export function twoUp(pdf: Pdf): void;
  export function twoUpStack(pdf: Pdf): void;

  /** Split each page into an x-by-y grid of pages. */
  export function chop(
    pdf: Pdf,
    range: Range,
    x: number,
    y: number,
    columns: boolean,
    rtl: boolean,
    btt: boolean,
  ): void;

  export function padAfter(pdf: Pdf, range: Range): void;
  export function padBefore(pdf: Pdf, range: Range): void;
  export function padMultiple(pdf: Pdf, n: number): void;

  export function scalePages(
    pdf: Pdf,
    range: Range,
    sx: number,
    sy: number,
  ): void;

  export function addText(
    metricsOnly: boolean,
    pdf: Pdf,
    range: Range,
    text: string,
    anchor: number,
    p1: number,
    p2: number,
    lineSpacing: number,
    bates: number,
    font: number,
    fontSize: number,
    r: number,
    g: number,
    b: number,
    underneath: boolean,
    relativeToCropbox: boolean,
    outline: boolean,
    opacity: number,
    justification: number,
    midline: boolean,
    topline: boolean,
    filename: string,
    linewidth: number,
    embedFonts: boolean,
  ): void;

  export const posCentre: number;
  export const posLeft: number;
  export const posRight: number;
  export const top: number;
  export const topLeft: number;
  export const topRight: number;
  export const left: number;
  export const bottomLeft: number;
  export const bottom: number;
  export const bottomRight: number;
  export const right: number;
  export const diagonal: number;
  export const reverseDiagonal: number;

  export const timesRoman: number;
  export const timesBold: number;
  export const helvetica: number;
  export const helveticaBold: number;
  export const courier: number;

  export const leftJustify: number;
  export const centreJustify: number;
  export const rightJustify: number;

  export function attachFileFromMemory(data: Uint8Array, filename: string, pdf: Pdf): void;
  export function removeAttachedFiles(pdf: Pdf): void;
  export function startGetAttachments(pdf: Pdf): void;
  export function numberGetAttachments(): number;
  export function getAttachmentName(index: number): string;
  export function getAttachmentPage(index: number): number;
  export function getAttachmentData(index: number): Uint8Array;
  export function endGetAttachments(): void;

  export function getBookmarksJSON(pdf: Pdf): Uint8Array;
  export function setBookmarksJSON(pdf: Pdf, data: Uint8Array): void;

  export const decimalArabic: number;
  export const uppercaseRoman: number;
  export const lowercaseRoman: number;
  export const uppercaseLetters: number;
  export const lowercaseLetters: number;
  export function addPageLabels(pdf: Pdf, style: number, prefix: string, offset: number, range: Range, progress: boolean): void;

  export function stampOn(stamp: Pdf, pdf: Pdf, range: Range): void;
  export function stampUnder(stamp: Pdf, pdf: Pdf, range: Range): void;

  export function startGetOCGList(pdf: Pdf): number;
  export function ocgListEntry(index: number): string;
  export function endGetOCGList(): void;
  export function ocgRename(pdf: Pdf, from: string, to: string): void;
  export function ocgCoalesce(pdf: Pdf): void;
  export function ocgOrderAll(pdf: Pdf): void;
}
