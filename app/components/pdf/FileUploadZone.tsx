"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { filterPdfFiles, formatFileSize } from "../../lib/files";
import { PdfThumbnail } from "./PdfThumbnail";

interface FileUploadZoneProps {
  files: ReadonlyArray<File>;
  multiple?: boolean;
  label: string;
  hint?: string;
  accept?: string;
  chooseLabel?: string;
  filterFiles?: (files: Iterable<File>) => File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onClear?: () => void;
  onMove?: (index: number, delta: -1 | 1) => void;
  previews?: boolean;
}

export function FileUploadZone({
  files,
  multiple = false,
  label,
  hint,
  accept = "application/pdf,.pdf",
  chooseLabel,
  filterFiles = filterPdfFiles,
  onFiles,
  onRemove,
  onClear,
  onMove,
  previews = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const isImageZone = accept.includes("image");
  const EmptyIcon = isImageZone ? ImageIcon : FileText;
  const acceptedLabel = isImageZone ? "images" : "PDF files";

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

  const openFileDialog = () => inputRef.current?.click();

  return (
    <div
      className={cn(
        "relative flex min-h-52 flex-col items-center overflow-hidden rounded-xl border border-dashed border-input px-4 pb-4 pt-10 transition-colors",
        files.length === 0 && "stripes justify-center",
        dragging && "stripes-accent border-primary bg-accent/50",
      )}
      data-dragging={dragging || undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <p className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        1. Add {multiple ? "files" : "file"}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={(event) => handleSelect(event.target.files)}
        aria-label={label}
      />

      {files.length > 0 ? (
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Files ({files.length})
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openFileDialog}>
                <Upload
                  data-icon="inline-start"
                  className="-ms-0.5 size-3.5 opacity-60"
                  aria-hidden
                />
                {multiple ? "Add files" : "Replace"}
              </Button>
              {onClear ? (
                <Button variant="outline" size="sm" onClick={onClear}>
                  <Trash2
                    data-icon="inline-start"
                    className="-ms-0.5 size-3.5 opacity-60"
                    aria-hidden
                  />
                  Remove all
                </Button>
              ) : null}
            </div>
          </div>

          <div className="w-full space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}-${file.size}`}
                className="flex animate-rise-in items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 pe-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex aspect-square size-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border">
                    {previews ? (
                      <PdfThumbnail
                        file={file}
                        className="w-7 rounded-none border-0"
                      />
                    ) : (
                      <FileText className="size-4 opacity-60" aria-hidden />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p
                      className="truncate text-[13px] font-medium"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {onMove && index > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground/80 hover:text-foreground"
                      onClick={() => onMove(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp aria-hidden />
                    </Button>
                  ) : null}
                  {onMove && index < files.length - 1 ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground/80 hover:text-foreground"
                      onClick={() => onMove(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground/80 hover:text-foreground"
                    onClick={() => onRemove(index)}
                    aria-label="Remove file"
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-3 text-center outline-none transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={openFileDialog}
        >
          <EmptyIcon
            className="mb-3 size-7 shrink-0 text-primary"
            aria-hidden
          />
          <p className="mb-1.5 font-heading italic text-base leading-snug">
            {label}
          </p>
          {hint ? (
            <p className="max-w-md text-sm text-muted-foreground">{hint}</p>
          ) : null}
          <span className="mt-2 text-xs text-muted-foreground">
            Accepts {acceptedLabel}. No app-enforced size limit; browser memory
            limits apply.
          </span>
          <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-popover px-3 font-medium shadow-xs/5">
            <Upload
              data-icon="inline-start"
              className="-ms-1 opacity-60"
              aria-hidden
            />
            {chooseLabel ?? `Select PDF${multiple ? "s" : ""}`}
          </span>
        </button>
      )}
    </div>
  );
}
