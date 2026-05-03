"use client";

import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { Dropzone } from "../Dropzone";
import { FileRow } from "../FileRow";
import { PdfThumbnail } from "../PdfThumbnail";

interface Props {
  workspace: PdfWorkspaceState;
}

export function PdfToImagesPanel({ workspace }: Props) {
  const file = workspace.pdfImageFile;
  return (
    <section className="panel" data-testid="pdf-to-images-panel">
      <header className="panel-header">
        <div>
          <p className="panel-eyebrow">VII.Render</p>
          <h2 className="panel-title">
            Pull <em>the proofs</em>
          </h2>
        </div>
      </header>
      <p className="panel-lede">
        Render every PDF page as PNG or JPG. Multi-page documents download as a
        ZIP with one image per page.
      </p>

      <Dropzone
        label={file ? "Replace loaded PDF" : "Drop a PDF or click to browse"}
        hint="Quality controls the render scale."
        onFiles={(files) => workspace.setPdfImageFile(files[0] ?? null)}
      />

      {file ? (
        <div className="file-list">
          <FileRow
            file={file}
            index={0}
            preview={<PdfThumbnail file={file} alt="" />}
            onRemove={() => workspace.setPdfImageFile(null)}
          />
        </div>
      ) : null}

      <div className="field-grid">
        <label className="field-label" htmlFor="pdf-image-format">
          Format
        </label>
        <select
          id="pdf-image-format"
          className="field-input field-select"
          value={workspace.pdfImageFormat}
          onChange={(event) =>
            workspace.setPdfImageFormat(
              event.target.value === "jpg" ? "jpg" : "png",
            )
          }
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
        </select>

        <label className="field-label" htmlFor="pdf-image-quality">
          Quality
        </label>
        <select
          id="pdf-image-quality"
          className="field-input field-select"
          value={workspace.pdfImageQuality}
          onChange={(event) => {
            const value = event.target.value;
            workspace.setPdfImageQuality(
              value === "standard" || value === "maximum" ? value : "high",
            );
          }}
        >
          <option value="standard">Standard</option>
          <option value="high">High</option>
          <option value="maximum">Maximum</option>
        </select>
      </div>

      <div className="actions">
        <button
          type="button"
          className="button button-primary"
          disabled={!file || workspace.isRunning}
          onClick={workspace.runPdfToImages}
          data-testid="run-pdf-to-images"
        >
          {workspace.isRunning ? "Rendering…" : "Render Images"}
        </button>
      </div>
    </section>
  );
}
