"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";
import { PdfThumbnail } from "../PdfThumbnail";

interface Props {
  workspace: PdfWorkspaceState;
}

export function MergePanel({ workspace }: Props) {
  const { mergeFiles } = workspace;
  return (
    <section className="panel" data-testid="merge-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">II.Merge</p>
          <h2 className="panel-title">
            Bind <em>the volumes</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Combine multiple PDFs into one volume. <em>Order</em> is preserved, use
        the arrows to reorder before merging.
      </p>

      <Dropzone
        multiple
        label="Drop your PDFs or click to browse"
        hint="At least two files required."
        onFiles={workspace.addMergeFiles}
      />

      {mergeFiles.length > 0 ? (
        <div className="file-list">
          {mergeFiles.map((file, index) => (
            <FileRow
              key={`${file.name}-${index}-${file.size}`}
              file={file}
              index={index}
              preview={<PdfThumbnail file={file} alt="" />}
              onRemove={() => workspace.removeMergeFile(index)}
              onMoveUp={
                index > 0 ? () => workspace.moveMergeFile(index, -1) : undefined
              }
              onMoveDown={
                index < mergeFiles.length - 1
                  ? () => workspace.moveMergeFile(index, 1)
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={mergeFiles.length < 2 || workspace.isRunning}
          onClick={workspace.runMerge}
          data-testid="run-merge"
        >
          {workspace.isRunning ? "Merging…" : "Merge"}
        </button>
        {mergeFiles.length > 0 ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={workspace.clearMergeFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
