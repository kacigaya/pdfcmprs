"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { triggerDownload } from "../../lib/download";
import type {
  StatusTone,
  WorkspaceResult,
  WorkspaceStatus,
} from "../../features/pdf/types";

interface ResultCardProps {
  status: WorkspaceStatus;
  progress: number;
  result: WorkspaceResult | null;
  isRunning: boolean;
  active: boolean;
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

const badgeVariantByTone = {
  idle: "outline",
  info: "info",
  success: "success",
  error: "error",
} as const;

export function ResultCard({
  status,
  progress,
  result,
  isRunning,
  active,
}: ResultCardProps) {
  const showProgress = isRunning || progress > 0;
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const tone = stampTone(isRunning, status.tone, Boolean(result));
  const [copyLabel, setCopyLabel] = useState("Copy Text");

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
    window.setTimeout(() => setCopyLabel("Copy Text"), 1400);
  }

  return (
    <Card
      className={
        active
          ? "sticky top-20 animate-rise-in p-5 sm:p-6"
          : "hidden min-h-28 p-5 lg:flex lg:max-w-md"
      }
      render={<aside />}
      aria-busy={isRunning}
      data-testid="result-card"
    >
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        <span>Output</span>
        <Badge
          variant={badgeVariantByTone[tone]}
          className="font-mono uppercase tracking-[0.18em]"
        >
          {stampLabel(isRunning, status.tone, Boolean(result))}
        </Badge>
      </div>

      {result ? (
        <>
          <h3 className="break-words font-heading italic text-xl leading-tight">
            {result.filename}
          </h3>
          {result.description ? (
            <p
              className="mt-2 text-pretty font-heading italic leading-normal"
              data-testid="status-message"
            >
              {result.description}
            </p>
          ) : null}
          {result.details ? (
            <dl className="mt-4 border-t border-border">
              {result.details.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1fr)] gap-3 border-b border-border py-2"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                    {item.label}
                  </dt>
                  <dd className="m-0 break-words text-sm">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {result.text ? (
            <pre
              className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
              data-testid="extracted-text"
            >
              {result.text}
            </pre>
          ) : null}
        </>
      ) : status.message ? (
        <p
          className={
            status.tone === "error"
              ? "text-pretty font-heading italic leading-normal text-destructive"
              : "text-pretty font-heading italic leading-normal"
          }
          data-testid="status-message"
        >
          {status.message}
        </p>
      ) : (
        <p className="text-pretty font-heading italic leading-normal text-muted-foreground">
          Add a file and run the tool. Your result appears here.
        </p>
      )}

      {showProgress ? (
        <div className="mt-4">
          <Progress value={pct} aria-label="Processing progress">
            <ProgressTrack className="h-2 rounded-sm border border-border bg-muted">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>Processing</span>
            <span>{pct.toString().padStart(3, "0")}%</span>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-2 border-t border-dashed border-border pt-4">
          {result.text ? (
            <Button
              variant="outline"
              onClick={() => copyText(result.text ?? "")}
              data-testid="copy-text-button"
            >
              <span aria-live="polite">{copyLabel}</span>
            </Button>
          ) : null}
          {result.blob ? (
            <Button
              onClick={() => {
                if (result.blob) triggerDownload(result.blob, result.filename);
              }}
              data-testid="download-button"
            >
              Download
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
