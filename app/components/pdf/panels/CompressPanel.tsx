"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useFileList } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { compressPdf, type CompressionLevel } from "../../../features/pdf/services/compress";
import { FileUploadZone } from "../FileUploadZone";
import { createStoredZip } from "../../../lib/zip";

function formatPercent(ratio: number): string {
  return `${Math.max(0, Math.round(ratio * 100))}%`;
}

export default function CompressPanel({ run }: ToolPanelProps) {
  const slot = useFileList(run.reset);
  const [level, setLevel] = useState<CompressionLevel>("balanced");
  const file = slot.files[0];

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      const outputs = [];
      for (let index = 0; index < slot.files.length; index += 1) {
        const out = await compressPdf(slot.files[index], level);
        outputs.push(out);
        report(((index + 1) / slot.files.length) * 95);
      }
      if (outputs.length > 1) {
        return {
          blob: createStoredZip(await Promise.all(outputs.map(async (out) => ({ filename: out.filename, bytes: new Uint8Array(await out.blob.arrayBuffer()) })))),
          filename: "compressed-pdfs.zip",
          description: `${outputs.length} PDFs compressed and packaged as ZIP.`,
          message: `Compressed ${outputs.length} PDFs.`,
        };
      }
      const out = outputs[0];
      const saved =
        out.originalSize > out.compressedSize
          ? `Saved ${formatPercent(out.ratio)}. ${out.compressedSize} bytes vs ${out.originalSize} bytes.`
          : `No size reduction. Output is ${out.compressedSize} bytes.`;
      return {
        blob: out.blob,
        filename: out.filename,
        description: saved,
        message: `Compression complete. ${saved}`,
      };
    });
  }

  return (
    <section data-testid="compress-panel">
      <FileUploadZone
        multiple
        files={slot.files}
        label="Drop your PDF here"
        hint="Add one PDF, or several for a batch ZIP"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <label className="mt-5 block max-w-xs text-sm font-medium text-foreground">
        Compression level
        <select
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
          value={level}
          onChange={(event) => setLevel(event.target.value as CompressionLevel)}
          disabled={run.isRunning}
        >
          <option value="lossless">Lossless rewrite</option>
          <option value="light">Light</option>
          <option value="balanced">Balanced</option>
          <option value="aggressive">Aggressive</option>
        </select>
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={slot.files.length === 0 || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-compress"
        >
          {run.isRunning ? "Compressing…" : "Compress"}
        </Button>
        {slot.files.length > 0 ? (
          <Button
            variant="outline"
            onClick={slot.onClear}
            disabled={run.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
