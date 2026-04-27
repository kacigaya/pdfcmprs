"use client";

import { triggerDownload } from "../../lib/download";
import type {
  StatusTone,
  WorkspaceResult,
  WorkspaceStatus,
} from "../../features/pdf/hooks/usePdfWorkspace";

interface ResultCardProps {
  status: WorkspaceStatus;
  progress: number;
  result: WorkspaceResult | null;
  isRunning: boolean;
}

function stampLabel(
  isRunning: boolean,
  tone: StatusTone,
  hasResult: boolean,
): string {
  if (isRunning) return "Processing";
  if (tone === "error") return "Error";
  if (hasResult || tone === "success") return "Ready";
  if (tone === "info") return "Running";
  return "Idle";
}

function stampTone(
  isRunning: boolean,
  tone: StatusTone,
  hasResult: boolean,
): StatusTone {
  if (isRunning) return "info";
  if (tone === "error") return "error";
  if (hasResult) return "success";
  return tone;
}

export function ResultCard({
  status,
  progress,
  result,
  isRunning,
}: ResultCardProps) {
  const showProgress = isRunning || progress > 0;
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const tone = stampTone(isRunning, status.tone, Boolean(result));

  return (
    <aside className="output" data-testid="result-card">
      <div className="output-eyebrow">
        <span>Output</span>
        <span
          className="output-stamp"
          data-tone={tone === "idle" ? undefined : tone}
        >
          {stampLabel(isRunning, status.tone, Boolean(result))}
        </span>
      </div>

      {result ? (
        <>
          <h3 className="output-title">{result.filename}</h3>
          {result.description ? (
            <p className="output-message" data-testid="status-message">
              {result.description}
            </p>
          ) : null}
        </>
      ) : status.message ? (
        <p
          className="output-message"
          data-tone={status.tone === "idle" ? undefined : status.tone}
          data-testid="status-message"
        >
          {status.message}
        </p>
      ) : (
        <p className="output-empty">
          No operation yet. Choose a file and run an action.
        </p>
      )}

      {showProgress ? (
        <>
          <div className="progress" aria-hidden={!isRunning}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-meta">
            <span>Processing</span>
            <span>{pct.toString().padStart(3, "0")}%</span>
          </div>
        </>
      ) : null}

      {result ? (
        <div className="output-cta">
          <button
            type="button"
            className="button button-primary"
            onClick={() => triggerDownload(result.blob, result.filename)}
            data-testid="download-button"
          >
            Download / {result.filename}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
