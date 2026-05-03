"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { filterImageFiles } from "../../../lib/files";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";

interface Props {
  workspace: PdfWorkspaceState;
}

export function ImagesToPdfPanel({ workspace }: Props) {
  const { imageFiles } = workspace;
  return (
    <section className="panel" data-testid="images-to-pdf-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">VI.Images</p>
          <h2 className="panel-title">
            Bind <em>the plates</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Turn JPG, PNG, or WebP images into a PDF. The image order below becomes
        the page order in the final document.
      </p>

      <Dropzone
        multiple
        label="Drop images or click to browse"
        hint="JPG, PNG, and WebP supported."
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        chooseLabel="Choose Images"
        filterFiles={filterImageFiles}
        onFiles={workspace.addImageFiles}
      />

      {imageFiles.length > 0 ? (
        <div className="file-list">
          {imageFiles.map((file, index) => (
            <FileRow
              key={`${file.name}-${index}-${file.size}`}
              file={file}
              index={index}
              onRemove={() => workspace.removeImageFile(index)}
              onMoveUp={
                index > 0 ? () => workspace.moveImageFile(index, -1) : undefined
              }
              onMoveDown={
                index < imageFiles.length - 1
                  ? () => workspace.moveImageFile(index, 1)
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
          disabled={imageFiles.length === 0 || workspace.isRunning}
          onClick={workspace.runImagesToPdf}
          data-testid="run-images-to-pdf"
        >
          {workspace.isRunning ? "Creating…" : "Create PDF"}
        </button>
        {imageFiles.length > 0 ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={workspace.clearImageFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
