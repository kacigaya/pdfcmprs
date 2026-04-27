"use client";

import { useCallback, useState } from "react";
import { compressPdf } from "../services/compress";
import { mergePdfs } from "../services/merge";
import { splitPdf } from "../services/split";

export type ToolId = "compress" | "merge" | "split";

export type StatusTone = "idle" | "info" | "success" | "error";

export interface WorkspaceStatus {
  tone: StatusTone;
  message: string;
}

export interface WorkspaceResult {
  blob: Blob;
  filename: string;
  description?: string;
}

export interface PdfWorkspaceState {
  tool: ToolId;
  setTool: (tool: ToolId) => void;
  compressFiles: File[];
  mergeFiles: File[];
  splitFile: File | null;
  splitSelection: string;
  setSplitSelection: (value: string) => void;
  addCompressFiles: (files: File[]) => void;
  removeCompressFile: (index: number) => void;
  clearCompressFiles: () => void;
  addMergeFiles: (files: File[]) => void;
  removeMergeFile: (index: number) => void;
  clearMergeFiles: () => void;
  moveMergeFile: (index: number, direction: -1 | 1) => void;
  setSplitFile: (file: File | null) => void;
  status: WorkspaceStatus;
  progress: number;
  result: WorkspaceResult | null;
  isRunning: boolean;
  runCompress: () => Promise<void>;
  runMerge: () => Promise<void>;
  runSplit: () => Promise<void>;
  resetResult: () => void;
}

const idleStatus: WorkspaceStatus = { tone: "idle", message: "" };

function formatPercent(ratio: number): string {
  const value = Math.max(0, Math.round(ratio * 100));
  return `${value}%`;
}

export function usePdfWorkspace(): PdfWorkspaceState {
  const [tool, setTool] = useState<ToolId>("compress");
  const [compressFiles, setCompressFiles] = useState<File[]>([]);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitSelection, setSplitSelection] = useState<string>("");
  const [status, setStatus] = useState<WorkspaceStatus>(idleStatus);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<WorkspaceResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const addCompressFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setCompressFiles(files.slice(0, 1));
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  const removeCompressFile = useCallback((index: number) => {
    setCompressFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCompressFiles = useCallback(() => {
    setCompressFiles([]);
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  const addMergeFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setMergeFiles((prev) => [...prev, ...files]);
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  const removeMergeFile = useCallback((index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearMergeFiles = useCallback(() => {
    setMergeFiles([]);
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  const moveMergeFile = useCallback((index: number, direction: -1 | 1) => {
    setMergeFiles((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const setSplitFileSafe = useCallback((file: File | null) => {
    setSplitFile(file);
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  const beginRun = useCallback(() => {
    setIsRunning(true);
    setResult(null);
    setProgress(15);
    setStatus({ tone: "info", message: "Processing…" });
  }, []);

  const failRun = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    setStatus({ tone: "error", message });
    setProgress(0);
    setIsRunning(false);
  }, []);

  const runCompress = useCallback(async () => {
    if (isRunning) return;
    if (compressFiles.length === 0) {
      setStatus({ tone: "error", message: "Add a PDF file first." });
      return;
    }
    beginRun();
    try {
      setProgress(45);
      const out = await compressPdf(compressFiles[0]);
      setProgress(100);
      const saved =
        out.originalSize > out.compressedSize
          ? `Saved ${formatPercent(out.ratio)} — ${out.compressedSize} bytes vs ${out.originalSize} bytes.`
          : `No size reduction. Output is ${out.compressedSize} bytes.`;
      setStatus({ tone: "success", message: `Compression complete. ${saved}` });
      setResult({ blob: out.blob, filename: out.filename, description: saved });
    } catch (error) {
      failRun(error);
      return;
    }
    setIsRunning(false);
  }, [beginRun, compressFiles, failRun, isRunning]);

  const runMerge = useCallback(async () => {
    if (isRunning) return;
    if (mergeFiles.length < 2) {
      setStatus({ tone: "error", message: "Add at least 2 PDF files to merge." });
      return;
    }
    beginRun();
    try {
      setProgress(50);
      const out = await mergePdfs(mergeFiles);
      setProgress(100);
      setStatus({
        tone: "success",
        message: `Merge complete — ${out.pageCount} pages combined.`,
      });
      setResult({
        blob: out.blob,
        filename: out.filename,
        description: `${out.pageCount} pages combined from ${mergeFiles.length} files.`,
      });
    } catch (error) {
      failRun(error);
      return;
    }
    setIsRunning(false);
  }, [beginRun, failRun, isRunning, mergeFiles]);

  const runSplit = useCallback(async () => {
    if (isRunning) return;
    if (!splitFile) {
      setStatus({ tone: "error", message: "Add a PDF file first." });
      return;
    }
    if (!splitSelection.trim()) {
      setStatus({
        tone: "error",
        message: "Provide a page selection (e.g. 1, 3, 5–7).",
      });
      return;
    }
    beginRun();
    try {
      setProgress(50);
      const out = await splitPdf(splitFile, splitSelection);
      setProgress(100);
      setStatus({
        tone: "success",
        message: `Extraction complete — ${out.extractedPages.length} pages extracted.`,
      });
      setResult({
        blob: out.blob,
        filename: out.filename,
        description: `Extracted pages: ${out.extractedPages.join(", ")}.`,
      });
    } catch (error) {
      failRun(error);
      return;
    }
    setIsRunning(false);
  }, [beginRun, failRun, isRunning, splitFile, splitSelection]);

  const resetResult = useCallback(() => {
    setResult(null);
    setStatus(idleStatus);
    setProgress(0);
  }, []);

  return {
    tool,
    setTool,
    compressFiles,
    mergeFiles,
    splitFile,
    splitSelection,
    setSplitSelection,
    addCompressFiles,
    removeCompressFile,
    clearCompressFiles,
    addMergeFiles,
    removeMergeFile,
    clearMergeFiles,
    moveMergeFile,
    setSplitFile: setSplitFileSafe,
    status,
    progress,
    result,
    isRunning,
    runCompress,
    runMerge,
    runSplit,
    resetResult,
  };
}
