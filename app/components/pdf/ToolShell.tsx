"use client";

import { lazy, Suspense, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CATEGORIES, getTool } from "../../features/pdf/registry";
import { useToolRun } from "../../features/pdf/hooks/useToolRun";
import { PanelHeader } from "./PanelHeader";
import { ResultCard } from "./ResultCard";

interface ToolShellProps {
  slug: string;
}

function PanelFallback() {
  return (
    <div
      className="min-h-52 animate-pulse rounded-xl border border-dashed border-input"
      aria-hidden
    />
  );
}

export function ToolShell({ slug }: ToolShellProps) {
  const tool = getTool(slug);
  const run = useToolRun();
  const Panel = useMemo(() => (tool ? lazy(tool.load) : null), [tool]);

  if (!tool || !Panel) return null;

  const category = CATEGORIES.find((item) => item.id === tool.category);

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {run.status.message}
      </span>

      {/* minmax(0,…) on the single-column layout too: otherwise a long, nowrap
          filename sizes the auto track and the whole page scrolls sideways. */}
      <div className="grid items-start gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="animate-rise-in p-5 sm:p-7">
          <PanelHeader
            eyebrow={category?.label ?? "PDF tool"}
            title={tool.title}
            lede={tool.summary}
          />
          <Suspense fallback={<PanelFallback />}>
            <Panel tool={tool} run={run} />
          </Suspense>
          {run.status.tone === "error" && run.status.message ? (
            <p
              role="alert"
              data-testid="panel-error"
              className="mt-3 text-pretty font-heading italic leading-normal text-destructive"
            >
              {run.status.message}
            </p>
          ) : null}
        </Card>
        <ResultCard
          status={run.status}
          progress={run.progress}
          result={run.result}
          isRunning={run.isRunning}
        />
      </div>
    </>
  );
}
