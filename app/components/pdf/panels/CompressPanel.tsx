"use client";

import { Button } from "@/components/ui/button";
import { useFileSlot } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { compressPdf } from "../../../features/pdf/services/compress";
import { FileUploadZone } from "../FileUploadZone";

function formatPercent(ratio: number): string {
  return `${Math.max(0, Math.round(ratio * 100))}%`;
}

export default function CompressPanel({ run }: ToolPanelProps) {
  const slot = useFileSlot(run.reset);
  const { file } = slot;

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      report(45);
      const out = await compressPdf(file);
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
        files={slot.files}
        label="Drop your PDF here"
        hint="One file at a time"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-compress"
        >
          {run.isRunning ? "Compressing…" : "Compress"}
        </Button>
        {file ? (
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
