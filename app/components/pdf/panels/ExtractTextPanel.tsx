"use client";

import { Button } from "@/components/ui/button";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

export function ExtractTextPanel({ workspace }: Props) {
  const file = workspace.extractFile;
  return (
    <section data-testid="extract-panel">
      <PanelHeader
        eyebrow="V. Extract"
        title={
          <>
            Lift <em>the text</em>
          </>
        }
        lede="Extract selectable text from every PDF page and download the result as a plain text file."
      />

      <FileUploadZone
        previews
        files={file ? [file] : []}
        label="Drop your PDF here"
        hint="Scanned pages need OCR before text can be extracted"
        onFiles={(files) => workspace.setExtractFile(files[0] ?? null)}
        onRemove={() => workspace.setExtractFile(null)}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runExtract}
          data-testid="run-extract"
        >
          {workspace.isRunning ? "Extracting…" : "Extract Text"}
        </Button>
      </div>
    </section>
  );
}
