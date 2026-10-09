import { expect, test } from "bun:test";
import { editPdf, runWorkflow, type EditorOperation } from "./interactiveOps";

const file = new File(["invalid PDF"], "source.pdf");

test("editor rejects invalid operation geometry before opening the document", async () => {
  const operation: EditorOperation = { type: "redact", page: 1, x: 0, y: 0, width: 20, height: 20 };
  for (const invalid of [{ page: 1.5 }, { x: Infinity }, { width: 0 }, { height: -1 }]) {
    await expect(editPdf(file, [{ ...operation, ...invalid }])).rejects.toThrow("Each editor operation");
  }
  await expect(editPdf(file, [])).rejects.toThrow("at least one");
});

test("workflow rejects empty steps, unknown tools, and invalid compression levels", async () => {
  await expect(runWorkflow(file, [])).rejects.toThrow("at least one");
  await expect(runWorkflow(file, [{ tool: "unknown" }])).rejects.toThrow("Unsupported workflow step 1");
  await expect(runWorkflow(file, [{ tool: "compress", value: "unknown" }])).rejects.toThrow("Unsupported compression level");
});
