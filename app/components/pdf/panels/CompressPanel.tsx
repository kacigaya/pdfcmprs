"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";

interface Props {
  workspace: PdfWorkspaceState;
}

export function CompressPanel({ workspace }: Props) {
  const file = workspace.compressFiles[0];
  return (
    <section className="panel" data-testid="compress-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">I.Compress</p>
          <h2 className="panel-title">
            Reduce <em>the weight</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Re-presses the document with <em>object streams</em> to reduce file size
        without resampling images or altering the original layout.
      </p>

      <Dropzone
        label={file ? "Replace loaded PDF" : "Drop a PDF or click to browse"}
        hint="One file at a time."
        onFiles={workspace.addCompressFiles}
      />

      {file ? (
        <div className="file-list">
          <FileRow
            file={file}
            index={0}
            onRemove={() => workspace.removeCompressFile(0)}
          />
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!file || workspace.isRunning}
          onClick={workspace.runCompress}
          data-testid="run-compress"
        >
          {workspace.isRunning ? "Compressing…" : "Compress"}
        </button>
        {workspace.compressFiles.length > 0 ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={workspace.clearCompressFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
