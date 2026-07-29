"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ProgressReporter,
  ToolOutcome,
  WorkspaceResult,
  WorkspaceStatus,
} from "../types";

const IDLE_STATUS: WorkspaceStatus = { tone: "idle", message: "" };

export type ToolTask = (report: ProgressReporter) => Promise<ToolOutcome>;

export interface ToolRun {
  status: WorkspaceStatus;
  progress: number;
  result: WorkspaceResult | null;
  isRunning: boolean;
  /** Execute a tool service. No-ops if a run is already in flight. */
  run: (task: ToolTask) => Promise<void>;
  /** Surface a validation error without starting a run. */
  fail: (message: string) => void;
  /** Clear status/progress/result — called whenever inputs change. */
  reset: () => void;
}

export function useToolRun(): ToolRun {
  const [status, setStatus] = useState<WorkspaceStatus>(IDLE_STATUS);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WorkspaceResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  // Ref, not state: guards against a second run started in the same tick,
  // before the isRunning state update has landed.
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    if (runningRef.current) return;
    setResult(null);
    setStatus(IDLE_STATUS);
    setProgress(0);
  }, []);

  const fail = useCallback((message: string) => {
    setStatus({ tone: "error", message });
    setProgress(0);
  }, []);

  const run = useCallback(async (task: ToolTask) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setResult(null);
    setProgress(0);
    setStatus({ tone: "info", message: "Processing…" });
    try {
      const report: ProgressReporter = (percent) => {
        setProgress(Math.min(100, Math.max(0, Math.round(percent))));
      };
      const outcome = await task(report);
      setProgress(100);
      setStatus({ tone: "success", message: outcome.message ?? "Done." });
      setResult(outcome);
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unexpected error.",
      });
      setProgress(0);
    } finally {
      runningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return { status, progress, result, isRunning, run, fail, reset };
}
