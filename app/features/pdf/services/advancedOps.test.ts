import { describe, expect, test } from "bun:test";
import { ghostscriptPdfArgs, rotatedPlacement } from "./advancedOps";

/** Where pdf-lib's drawPage puts point (u, v) after rotating about (x, y). */
function place(u: number, v: number, x: number, y: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return [
    x + u * Math.cos(radians) - v * Math.sin(radians),
    y + u * Math.sin(radians) + v * Math.cos(radians),
  ];
}

describe("rotatedPlacement", () => {
  test.each([5, 30, 90, -45, 180, 270])(
    "keeps every corner on the sheet at %p degrees",
    (angle) => {
      const [w, h] = [612, 792];
      const { width, height, x, y } = rotatedPlacement(w, h, angle);
      for (const [u, v] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const [px, py] = place(u, v, x, y, angle);
        expect(px).toBeGreaterThanOrEqual(-1e-6);
        expect(py).toBeGreaterThanOrEqual(-1e-6);
        expect(px).toBeLessThanOrEqual(width + 1e-6);
        expect(py).toBeLessThanOrEqual(height + 1e-6);
      }
      const [cx, cy] = place(w / 2, h / 2, x, y, angle);
      expect(cx).toBeCloseTo(width / 2);
      expect(cy).toBeCloseTo(height / 2);
    },
  );
});

describe("ghostscriptPdfArgs", () => {
  test("runs Ghostscript in SAFER mode for every conversion", () => {
    for (const mode of ["pdfa1", "pdfa2", "pdfa3", "outlines"] as const) {
      const args = ghostscriptPdfArgs(mode);
      expect(args).toContain("-dSAFER");
      expect(args).not.toContain("-dNOSAFER");
    }
  });

  test("feeds the PDF/A definition before the input only for PDF/A", () => {
    expect(ghostscriptPdfArgs("pdfa2").slice(-2)).toEqual(["pdfa.ps", "in.pdf"]);
    expect(ghostscriptPdfArgs("outlines")).not.toContain("pdfa.ps");
  });
});
