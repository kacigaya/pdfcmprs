"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";
import { PdfThumbnail } from "../PdfThumbnail";

interface Props {
  workspace: PdfWorkspaceState;
}

export function ExtractTextPanel({ workspace }: Props) {
  const file = workspace.extractFile;
  return (
    <section className="panel" data-testid="extract-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">V.Extract</p>
          <h2 className="panel-title">
            Lift <em>the text</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Extract selectable text from every PDF page and download the result as a
        plain text file.
      </p>

      <Dropzone
        label={file ? "Replace loaded PDF" : "Drop a PDF or click to browse"}
        hint="Scanned pages need OCR before text can be extracted."
        onFiles={(files) => workspace.setExtractFile(files[0] ?? null)}
      />

      {file ? (
        <div className="file-list">
          <FileRow
            file={file}
            index={0}
            preview={<PdfThumbnail file={file} alt="" />}
            onRemove={() => workspace.setExtractFile(null)}
          />
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!file || workspace.isRunning}
          onClick={workspace.runExtract}
          data-testid="run-extract"
        >
          {workspace.isRunning ? "Extracting…" : "Extract Text"}
        </button>
      </div>
    </section>
  );
}
