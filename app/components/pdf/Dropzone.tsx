"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { filterPdfFiles } from "../../lib/files";

interface DropzoneProps {
  multiple?: boolean;
  label: string;
  hint?: string;
  accept?: string;
  chooseLabel?: string;
  filterFiles?: (files: Iterable<File>) => File[];
  onFiles: (files: File[]) => void;
}

export function Dropzone({
  multiple = false,
  label,
  hint,
  accept = "application/pdf,.pdf",
  chooseLabel,
  filterFiles = filterPdfFiles,
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleSelect = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const valid = filterFiles(list);
      if (valid.length > 0) onFiles(multiple ? valid : valid.slice(0, 1));
      if (inputRef.current) inputRef.current.value = "";
    },
    [filterFiles, multiple, onFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      handleSelect(event.dataTransfer.files);
    },
    [handleSelect],
  );

  return (
    <div
      className={`dropzone${dragging ? " dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <p className="dropzone-eyebrow">Drop zone</p>
      <p className="dropzone-title">{label}</p>
      {hint ? <p className="dropzone-hint">{hint}</p> : null}
      <div className="dropzone-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => inputRef.current?.click()}
        >
          {chooseLabel ?? `Choose PDF${multiple ? "s" : ""}`}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => handleSelect(event.target.files)}
      />
    </div>
  );
}
