import { describe, expect, test } from "bun:test";
import { ghostscriptCompressionArgs } from "./compress";

describe("ghostscriptCompressionArgs", () => {
  test("maps the three lossy levels to progressively smaller Ghostscript presets", () => {
    expect(ghostscriptCompressionArgs("light")).toContain("-dPDFSETTINGS=/printer");
    expect(ghostscriptCompressionArgs("balanced")).toContain("-dPDFSETTINGS=/ebook");
    expect(ghostscriptCompressionArgs("aggressive")).toContain("-dPDFSETTINGS=/screen");
  });

  test("always writes the output file consumed by the WASM wrapper", () => {
    expect(ghostscriptCompressionArgs("balanced")).toContain("-sOutputFile=out.pdf");
  });
});
