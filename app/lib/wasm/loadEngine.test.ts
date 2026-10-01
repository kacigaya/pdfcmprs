import { describe, expect, test } from "bun:test";
import { runCliTool, type EmscriptenFactory } from "./loadEngine";

/** Stand-in Emscripten module: main exits with `code` after writing `output`. */
function fakeEngine(code: number, output: Uint8Array | null): EmscriptenFactory {
  return async () => {
    const files = new Map<string, Uint8Array>();
    return {
      callMain() {
        if (output) files.set("out.pdf", output);
        return code;
      },
      FS: {
        writeFile: (path, data) => void files.set(path, data),
        readFile: (path) => {
          const data = files.get(path);
          if (!data) throw new Error("ENOENT");
          return data;
        },
        unlink: (path) => void files.delete(path),
        mkdir: () => undefined,
        readdir: () => [...files.keys()],
        stat: (path) => {
          if (!files.has(path)) throw new Error("ENOENT");
          return {};
        },
      },
    };
  };
}

function run(code: number, output: Uint8Array | null, successCodes?: number[]) {
  return runCliTool(fakeEngine(code, output), {
    args: [],
    inputs: { "in.pdf": new Uint8Array([1]) },
    output: "out.pdf",
    locateFile: () => "",
    successCodes,
  });
}

const PDF = new TextEncoder().encode("%PDF-1.7");

describe("runCliTool", () => {
  test("returns the output on a zero exit code", async () => {
    expect(await run(0, PDF)).toEqual(PDF);
  });

  test("rejects a failed run even when the engine left an output file", async () => {
    // qpdf creates out.pdf before refusing weak crypto and exits with 2.
    await expect(run(2, new Uint8Array())).rejects.toThrow("code 2");
    await expect(run(1, PDF)).rejects.toThrow("code 1");
  });

  test("rejects an empty output on a zero exit code", async () => {
    await expect(run(0, new Uint8Array())).rejects.toThrow();
  });

  test("accepts extra success codes such as qpdf's warning exit", async () => {
    await expect(run(3, PDF)).rejects.toThrow("code 3");
    expect(await run(3, PDF, [0, 3])).toEqual(PDF);
  });
});
