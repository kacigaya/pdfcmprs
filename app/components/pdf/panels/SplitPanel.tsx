"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileSlot } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { splitPdf } from "../../../features/pdf/services/split";
import { FileUploadZone } from "../FileUploadZone";
import { PageGrid } from "../PageGrid";

export default function SplitPanel({ run }: ToolPanelProps) {
  const slot = useFileSlot(run.reset);
  const [selection, setSelection] = useState("");
  const { file } = slot;

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    if (!selection.trim()) {
      run.fail("Provide a page selection (e.g. 1, 3, 5-7).");
      return;
    }
    await run.run(async (report) => {
      report(50);
      const out = await splitPdf(file, selection);
      return {
        blob: out.blob,
        filename: out.filename,
        description: `Extracted pages: ${out.extractedPages.join(", ")}.`,
        message: `Extraction complete. ${out.extractedPages.length} pages extracted.`,
      };
    });
  }

  return (
    <section data-testid="split-panel">
      <FileUploadZone
        previews
        files={slot.files}
        label="Drop your PDF here"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      {file ? (
        <PageGrid file={file} selection={selection} onChange={setSelection} />
      ) : null}

      <div className="mt-6 grid gap-1.5">
        <Label
          htmlFor="split-pages"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
        >
          Page selection
        </Label>
        <Input
          id="split-pages"
          name="splitPages"
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          value={selection}
          placeholder="e.g. 1, 3, 5-7…"
          onValueChange={setSelection}
          data-testid="split-selection-input"
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
          Commas for individual pages · hyphens for ranges.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || !selection.trim() || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-split"
        >
          {run.isRunning ? "Extracting…" : "Extract"}
        </Button>
      </div>
    </section>
  );
}
