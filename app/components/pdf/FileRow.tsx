"use client";

import type { ReactNode } from "react";
import { formatFileSize } from "../../lib/files";

interface FileRowProps {
  file: File;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  index?: number;
  preview?: ReactNode;
}

function formatIndex(index: number | undefined): string {
  if (typeof index !== "number") return "—";
  return `№${String(index + 1).padStart(2, "0")}`;
}

export function FileRow({
  file,
  onRemove,
  onMoveUp,
  onMoveDown,
  index,
  preview,
}: FileRowProps) {
  const className = preview ? "file-row file-row--with-preview" : "file-row";
  return (
    <div className={className}>
      {preview ? (
        <span className="file-row-preview">{preview}</span>
      ) : (
        <span className="file-row-index">{formatIndex(index)}</span>
      )}
      <span className="file-row-body">
        <span className="file-row-name" title={file.name}>
          {file.name}
        </span>
        {preview && typeof index === "number" ? (
          <span className="file-row-sub">{formatIndex(index)}</span>
        ) : null}
      </span>
      <span className="file-row-meta">{formatFileSize(file.size)}</span>
      <span className="file-row-controls">
        {onMoveUp ? (
          <button
            type="button"
            className="button button-icon"
            onClick={onMoveUp}
            aria-label="Monter"
          >
            ↑
          </button>
        ) : null}
        {onMoveDown ? (
          <button
            type="button"
            className="button button-icon"
            onClick={onMoveDown}
            aria-label="Descendre"
          >
            ↓
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="button button-icon"
            onClick={onRemove}
            aria-label="Retirer"
          >
            ×
          </button>
        ) : null}
      </span>
    </div>
  );
}
