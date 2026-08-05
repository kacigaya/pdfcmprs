"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJsModule = typeof import("pdfjs-dist");

let modulePromise: Promise<PdfJsModule> | null = null;
let workerConfigured = false;

async function getPdfJs(): Promise<PdfJsModule> {
  if (!modulePromise) {
    modulePromise = import("pdfjs-dist");
  }
  const pdfjs = await modulePromise;
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs;
}

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  task.onPassword = (updatePassword: (password: string) => void) => {
    const password = window.prompt(`Enter the password for ${file.name}:`);
    if (password !== null) updatePassword(password);
  };
  return task.promise;
}

export async function renderPageToDataUrl(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale = 0.4,
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas.toDataURL("image/png");
}

export interface RenderedPixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Render a page and hand back its raw pixels, for the formats browsers cannot
 * encode (BMP, TIFF) and for the tools that transform pixels before re-encoding.
 */
export async function renderPageToPixels(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<RenderedPixels> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // PDF pages are transparent by default; flatten onto white so greyscale and
  // inversion operate on what the reader actually shows.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: image.data, width: canvas.width, height: canvas.height };
}

/** Encode raw pixels back to a Blob through a canvas. */
export async function pixelsToBlob(
  pixels: RenderedPixels,
  type: string,
  quality?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // Copy into a fresh buffer: ImageData requires a plain ArrayBuffer, and the
  // canvas-derived array is typed as possibly shared.
  ctx.putImageData(
    new ImageData(
      new Uint8ClampedArray(pixels.data),
      pixels.width,
      pixels.height,
    ),
    0,
    0,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`This browser cannot encode ${type}.`));
      },
      type,
      quality,
    );
  });
}

export async function renderPageToBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  type: "image/png" | "image/jpeg",
  quality?: number,
): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to render page image."));
      },
      type,
      quality,
    );
  });
}
