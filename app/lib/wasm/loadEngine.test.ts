import { expect, test } from "bun:test";
import { runCliTool, type EmscriptenFactory } from "./loadEngine";

function factory(code: number, output: Uint8Array): EmscriptenFactory {
  return async () => ({
    callMain: () => code,
    FS: {
      writeFile() {}, readFile: () => output, unlink() {}, mkdir() {},
      readdir: () => [], stat: () => ({}),
    },
  });
}
const options = { args: [], inputs: {}, output: "out.pdf", locateFile: (path: string) => path };

test("CLI tools reject empty output left by a failed engine", async () => {
  await expect(runCliTool(factory(2, new Uint8Array()), options)).rejects.toThrow("code 2");
});
test("CLI tools reject partial output on a failing exit", async () => {
  await expect(runCliTool(factory(1, new Uint8Array([1, 2])), options)).rejects.toThrow("code 1");
});
test("CLI tools allow qpdf warnings with nonempty output and copy the heap", async () => {
  const heap = new Uint8Array([1, 2]);
  const result = await runCliTool(factory(3, heap), { ...options, successCodes: [0, 3] });
  heap.fill(0);
  expect([...result]).toEqual([1, 2]);
});
