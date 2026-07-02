"use client";

import { Button } from "@/components/ui/button";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

export function InspectPanel({ workspace }: Props) {
  const file = workspace.inspectFile;
  return (
    <section data-testid="inspect-panel">
      <PanelHeader
        eyebrow="IV. Inspect"
        title={
          <>
            Read <em>the colophon</em>
          </>
        }
        lede="Page count, dimensions, PDF version, and whatever metadata the file carries."
      />

      <FileUploadZone
        previews
        files={file ? [file] : []}
        label="Drop your PDF here"
        hint="Metadata stays in this browser tab"
        onFiles={(files) => workspace.setInspectFile(files[0] ?? null)}
        onRemove={() => workspace.setInspectFile(null)}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runInspect}
          data-testid="run-inspect"
        >
          {workspace.isRunning ? "Inspecting…" : "Inspect"}
        </Button>
      </div>
    </section>
  );
}
