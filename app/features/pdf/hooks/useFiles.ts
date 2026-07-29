"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Props shaped exactly for <FileUploadZone>, so a panel wiring up an upload
 * is one line instead of the five near-identical state blocks the old
 * usePdfWorkspace hook carried per tool.
 */
export interface FileSlotBinding {
  files: File[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

export interface FileListBinding extends FileSlotBinding {
  onMove: (index: number, delta: -1 | 1) => void;
}

/** Single-file input. Selecting a new file replaces the old one. */
export function useFileSlot(onChange?: () => void): FileSlotBinding & {
  file: File | null;
} {
  const [file, setFile] = useState<File | null>(null);

  const onFiles = useCallback(
    (next: File[]) => {
      if (next.length === 0) return;
      setFile(next[0]);
      onChange?.();
    },
    [onChange],
  );

  const onClear = useCallback(() => {
    setFile(null);
    onChange?.();
  }, [onChange]);

  const files = useMemo(() => (file ? [file] : []), [file]);

  return { file, files, onFiles, onRemove: onClear, onClear };
}

/** Multi-file input with the add/remove/move/clear semantics of the old hook. */
export function useFileList(onChange?: () => void): FileListBinding {
  const [files, setFiles] = useState<File[]>([]);

  const onFiles = useCallback(
    (next: File[]) => {
      if (next.length === 0) return;
      setFiles((prev) => [...prev, ...next]);
      onChange?.();
    },
    [onChange],
  );

  const onRemove = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      onChange?.();
    },
    [onChange],
  );

  const onClear = useCallback(() => {
    setFiles([]);
    onChange?.();
  }, [onChange]);

  const onMove = useCallback((index: number, delta: -1 | 1) => {
    setFiles((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  return { files, onFiles, onRemove, onClear, onMove };
}
