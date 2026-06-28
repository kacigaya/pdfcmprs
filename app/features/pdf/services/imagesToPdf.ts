import { PDFDocument } from "pdf-lib";
import { bytesToPdfBlob } from "../../../lib/blob";

async function imageFileToPngBytes(file: File): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((out) => {
      if (out) resolve(out);
      else reject(new Error("Unable to convert image."));
    }, "image/png");
  });
  return blob.arrayBuffer();
}

export async function imagesToPdf(files: File[]) {
  if (files.length === 0) {
    throw new Error("Add at least one image first.");
  }
  const doc = await PDFDocument.create();
  for (const file of files) {
    const isJpg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
    const buffer =
      isPng || isJpg ? await file.arrayBuffer() : await imageFileToPngBytes(file);
    const image = isJpg
      ? await doc.embedJpg(buffer)
      : await doc.embedPng(buffer);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return {
    blob: bytesToPdfBlob(bytes),
    filename: "images.pdf",
    pageCount: doc.getPageCount(),
  };
}
