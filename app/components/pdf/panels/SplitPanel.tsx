"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";
import { PdfThumbnail } from "../PdfThumbnail";
import { SplitPagesGrid } from "../SplitPagesGrid";

interface Props {
  workspace: PdfWorkspaceState;
}

export function SplitPanel({ workspace }: Props) {
  const file = workspace.splitFile;
  return (
    <section className="panel" data-testid="split-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">III.Split</p>
          <h2 className="panel-title">
            Extract <em>the pages</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Click pages below to select them, or type a range like{" "}
        <em>1, 3, 5-7</em> to extract only the pages you need.
      </p>

      <Dropzone
        label={file ? "Replace loaded PDF" : "Drop a PDF or click to browse"}
        onFiles={(files) => workspace.setSplitFile(files[0] ?? null)}
      />

      {file ? (
        <div className="file-list">
          <FileRow
            file={file}
            index={0}
            preview={<PdfThumbnail file={file} alt="" />}
            onRemove={() => workspace.setSplitFile(null)}
          />
        </div>
      ) : null}

      {file ? (
        <SplitPagesGrid
          file={file}
          selection={workspace.splitSelection}
          onChange={workspace.setSplitSelection}
        />
      ) : null}

      <label htmlFor="split-pages" className="field-label">
        Page selection
      </label>
      <input
        id="split-pages"
        type="text"
        className="field-input"
        value={workspace.splitSelection}
        placeholder="1, 3, 5-7"
        onChange={(event) => workspace.setSplitSelection(event.target.value)}
        data-testid="split-selection-input"
      />
      <p className="field-hint">
        Commas for individual pages · hyphens for ranges.
      </p>

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={
            !file || !workspace.splitSelection.trim() || workspace.isRunning
          }
          onClick={workspace.runSplit}
          data-testid="run-split"
        >
          {workspace.isRunning ? "Extracting…" : "Extract"}
        </button>
      </div>
    </section>
  );
}
