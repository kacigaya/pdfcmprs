"use client";

import { Button } from "@/components/ui/button";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

export function CompressPanel({ workspace }: Props) {
  const file = workspace.compressFiles[0];
  return (
    <section data-testid="compress-panel">
      <PanelHeader
        eyebrow="I. Compress"
        title={
          <>
            Reduce <em>the weight</em>
          </>
        }
        lede="Reduces file size with PDF object streams. Images and page layout stay unchanged."
      />

      <FileUploadZone
        files={workspace.compressFiles.slice(0, 1)}
        label="Drop your PDF here"
        hint="One file at a time"
        onFiles={workspace.addCompressFiles}
        onRemove={workspace.clearCompressFiles}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runCompress}
          data-testid="run-compress"
        >
          {workspace.isRunning ? "Compressing…" : "Compress"}
        </Button>
        {workspace.compressFiles.length > 0 ? (
          <Button
            variant="outline"
            onClick={workspace.clearCompressFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
