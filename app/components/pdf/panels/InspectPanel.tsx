"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";
import { PdfThumbnail } from "../PdfThumbnail";

interface Props {
  workspace: PdfWorkspaceState;
}

export function InspectPanel({ workspace }: Props) {
  const file = workspace.inspectFile;
  return (
    <section className="panel" data-testid="inspect-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">IV.Inspect</p>
          <h2 className="panel-title">
            Read <em>the colophon</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Inspect page count, dimensions, file size, PDF version, and embedded
        document metadata without uploading the file.
      </p>

      <Dropzone
        label={file ? "Replace loaded PDF" : "Drop a PDF or click to browse"}
        hint="Metadata stays in this browser tab."
        onFiles={(files) => workspace.setInspectFile(files[0] ?? null)}
      />

      {file ? (
        <div className="file-list">
          <FileRow
            file={file}
            index={0}
            preview={<PdfThumbnail file={file} alt="" />}
            onRemove={() => workspace.setInspectFile(null)}
          />
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!file || workspace.isRunning}
          onClick={workspace.runInspect}
          data-testid="run-inspect"
        >
          {workspace.isRunning ? "Inspecting…" : "Inspect"}
        </button>
      </div>
    </section>
  );
}
