"use client";

import { Button } from "@/components/ui/button";
import { useFileList } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { mergePdfs } from "../../../features/pdf/services/merge";
import { FileUploadZone } from "../FileUploadZone";

export default function MergePanel({ run }: ToolPanelProps) {
  const list = useFileList(run.reset);

  async function handleRun() {
    if (list.files.length < 2) {
      run.fail("Add at least 2 PDF files to merge.");
      return;
    }
    await run.run(async (report) => {
      report(50);
      const out = await mergePdfs(list.files);
      return {
        blob: out.blob,
        filename: out.filename,
        description: `${out.pageCount} pages combined from ${list.files.length} files.`,
        message: `Merge complete. ${out.pageCount} pages combined.`,
      };
    });
  }

  return (
    <section data-testid="merge-panel">
      <FileUploadZone
        multiple
        previews
        files={list.files}
        label="Drop your PDFs here"
        hint="At least two files required"
        onFiles={list.onFiles}
        onRemove={list.onRemove}
        onMove={list.onMove}
        onClear={list.onClear}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={list.files.length < 2 || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-merge"
        >
          {run.isRunning ? "Merging…" : "Merge PDFs"}
        </Button>
        {list.files.length > 0 ? (
          <Button
            variant="outline"
            onClick={list.onClear}
            disabled={run.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
