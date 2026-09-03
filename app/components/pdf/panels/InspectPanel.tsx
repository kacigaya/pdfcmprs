"use client";

import { Button } from "@/components/ui/button";
import { useFileSlot } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { inspectPdf } from "../../../features/pdf/services/inspect";
import { FileUploadZone } from "../FileUploadZone";

export default function InspectPanel({ run }: ToolPanelProps) {
  const slot = useFileSlot(run.reset);
  const { file } = slot;

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      report(60);
      const out = await inspectPdf(file);
      return {
        filename: out.filename,
        description: out.description,
        details: out.items,
        message: "Inspection complete.",
      };
    });
  }

  return (
    <section data-testid="inspect-panel">
      <FileUploadZone
        previews
        files={slot.files}
        label="Drop your PDF here"
        hint="Metadata stays in this browser tab"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-inspect"
        >
          {run.isRunning ? "Inspecting…" : "Inspect PDF"}
        </Button>
      </div>
    </section>
  );
}
