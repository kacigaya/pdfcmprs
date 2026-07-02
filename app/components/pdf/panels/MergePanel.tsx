"use client";

import { Button } from "@/components/ui/button";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

export function MergePanel({ workspace }: Props) {
  const { mergeFiles } = workspace;
  return (
    <section data-testid="merge-panel">
      <PanelHeader
        eyebrow="II. Merge"
        title={
          <>
            Bind <em>the volumes</em>
          </>
        }
        lede={
          <>
            Combine several PDFs into one volume. Files merge{" "}
            <em>in the order shown</em>, so use the arrows to arrange them
            first.
          </>
        }
      />

      <FileUploadZone
        multiple
        previews
        files={mergeFiles}
        label="Drop your PDFs here"
        hint="At least two files required"
        onFiles={workspace.addMergeFiles}
        onRemove={workspace.removeMergeFile}
        onMove={workspace.moveMergeFile}
        onClear={workspace.clearMergeFiles}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={mergeFiles.length < 2 || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runMerge}
          data-testid="run-merge"
        >
          {workspace.isRunning ? "Merging…" : "Merge"}
        </Button>
        {mergeFiles.length > 0 ? (
          <Button
            variant="outline"
            onClick={workspace.clearMergeFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
