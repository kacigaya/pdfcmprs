"use client";

import { Button } from "@/components/ui/button";
import { useFileSlot } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { extractPdfText } from "../../../features/pdf/services/extractText";
import { FileUploadZone } from "../FileUploadZone";

export default function ExtractTextPanel({ run }: ToolPanelProps) {
  const slot = useFileSlot(run.reset);
  const { file } = slot;

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      report(60);
      const out = await extractPdfText(file);
      return {
        blob: out.blob,
        filename: out.filename,
        description: out.description,
        text: out.text,
        message: "Text extraction complete.",
      };
    });
  }

  return (
    <section data-testid="extract-panel">
      <FileUploadZone
        previews
        files={slot.files}
        label="Drop your PDF here"
        hint="Scanned pages need OCR before text can be extracted"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-extract"
        >
          {run.isRunning ? "Extracting…" : "Extract Text"}
        </Button>
      </div>
    </section>
  );
}
