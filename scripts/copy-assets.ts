/**
 * Copies engine glue + WASM binaries out of node_modules into public/ so they
 * are served from our own origin. Keeps the app air-gapped (no CDN at runtime)
 * and sidesteps bundler WASM handling entirely — loaders fetch these by URL.
 *
 * Run by the `dev` and `build` scripts.
 */
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const MODULES = join(ROOT, "node_modules");
const PUBLIC = join(ROOT, "public");

/** [source relative to node_modules, destination relative to public] */
const ASSETS: ReadonlyArray<[string, string]> = [
  ["pdfjs-dist/legacy/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],

  ["@neslinesli93/qpdf-wasm/dist/qpdf.js", "wasm/qpdf/qpdf.js"],
  ["@neslinesli93/qpdf-wasm/dist/qpdf.wasm", "wasm/qpdf/qpdf.wasm"],

  ["@jspawn/ghostscript-wasm/gs.js", "wasm/ghostscript/gs.js"],
  ["@jspawn/ghostscript-wasm/gs.wasm", "wasm/ghostscript/gs.wasm"],
  ["pdfkit/js/data/sRGB_IEC61966_2_1.icc", "wasm/ghostscript/srgb.icc"],

  ["mupdf/dist/mupdf.js", "wasm/mupdf/mupdf.js"],
  ["mupdf/dist/mupdf-wasm.js", "wasm/mupdf/mupdf-wasm.js"],
  ["mupdf/dist/mupdf-wasm.wasm", "wasm/mupdf/mupdf-wasm.wasm"],

  ["wasm-vips/lib/vips-es6.js", "wasm/vips/vips-es6.js"],
  ["wasm-vips/lib/vips.wasm", "wasm/vips/vips.wasm"],
  ["wasm-vips/lib/vips-heif.wasm", "wasm/vips/vips-heif.wasm"],
  ["wasm-vips/lib/vips-jxl.wasm", "wasm/vips/vips-jxl.wasm"],
  ["wasm-vips/lib/vips-resvg.wasm", "wasm/vips/vips-resvg.wasm"],

  ["@techstark/opencv-js/dist/opencv.js", "wasm/opencv/opencv.js"],

  ["@matbee/libreoffice-converter/wasm/soffice.js", "libreoffice-wasm/soffice.js"],
  ["@matbee/libreoffice-converter/wasm/soffice.wasm", "libreoffice-wasm/soffice.wasm"],
  ["@matbee/libreoffice-converter/wasm/soffice.data", "libreoffice-wasm/soffice.data"],
  ["@matbee/libreoffice-converter/wasm/soffice.worker.js", "libreoffice-wasm/soffice.worker.js"],
  ["@matbee/libreoffice-converter/dist/browser.worker.global.js", "libreoffice-wasm/browser.worker.global.js"],
];
// coherentpdf, pdfkit, tesseract.js, utif2, heic-decode and the diff libraries
// are plain JS — the bundler code-splits them, so they need no copy here.

let copied = 0;
for (const [from, to] of ASSETS) {
  const source = join(MODULES, from);
  const destination = join(PUBLIC, to);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  copied += 1;
}

await cp(
  join(MODULES, "@bentopdf/pymupdf-wasm/assets"),
  join(PUBLIC, "wasm/pymupdf"),
  { recursive: true },
);
await cp(
  join(MODULES, "@bentopdf/pymupdf-wasm/dist/index.js"),
  join(PUBLIC, "wasm/pymupdf/index.js"),
);
copied += 1;

console.log(`copy-assets: ${copied} files -> public/`);
