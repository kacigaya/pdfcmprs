"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";
import { SplitPagesGrid } from "../SplitPagesGrid";

interface Props {
  workspace: PdfWorkspaceState;
}

export function SplitPanel({ workspace }: Props) {
  const file = workspace.splitFile;
  return (
    <section data-testid="split-panel">
      <PanelHeader
        eyebrow="III. Split"
        title={
          <>
            Extract <em>the pages</em>
          </>
        }
        lede={
          <>
            Click pages below to select them, or type a range like{" "}
            <em>1, 3, 5-7</em> to extract only the pages you need.
          </>
        }
      />

      <FileUploadZone
        previews
        files={file ? [file] : []}
        label="Drop your PDF here"
        onFiles={(files) => workspace.setSplitFile(files[0] ?? null)}
        onRemove={() => workspace.setSplitFile(null)}
      />

      {file ? (
        <SplitPagesGrid
          file={file}
          selection={workspace.splitSelection}
          onChange={workspace.setSplitSelection}
        />
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
          type="text"
          className="font-mono"
          value={workspace.splitSelection}
          placeholder="1, 3, 5-7"
          onChange={(event) => workspace.setSplitSelection(event.target.value)}
          data-testid="split-selection-input"
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
          Commas for individual pages · hyphens for ranges.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={
            !file || !workspace.splitSelection.trim() || workspace.isRunning
          }
          loading={workspace.isRunning}
          onClick={workspace.runSplit}
          data-testid="run-split"
        >
          {workspace.isRunning ? "Extracting…" : "Extract"}
        </Button>
      </div>
    </section>
  );
}
