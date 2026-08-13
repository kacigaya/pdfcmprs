"use client";

import { lazy, Suspense, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORIES, getTool, TOOLS } from "../../features/pdf/registry";
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
  const outputActive =
    run.isRunning || Boolean(run.result) || run.status.tone !== "idle";
  const related = TOOLS.filter(
    (item) => item.category === tool.category && item.slug !== tool.slug,
  ).slice(0, 3);

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {run.status.message}
      </span>

      {/* minmax(0,…) on the single-column layout too: otherwise a long, nowrap
          filename sizes the auto track and the whole page scrolls sideways. */}
      <div
        className={cn(
          "grid items-start gap-6 grid-cols-[minmax(0,1fr)]",
          outputActive && "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]",
        )}
      >
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
          active={outputActive}
        />
      </div>

      {related.length > 0 ? (
        <section
          className="mt-10 border-t border-border pt-6"
          aria-labelledby="related-tools"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="related-tools"
              className="font-heading text-2xl tracking-tight"
            >
              Related tools
            </h2>
            <Link
              href={`/?category=${tool.category}#catalog`}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              All {category?.label ?? "PDF"} tools
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${item.slug}`}
                  className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-heading text-lg">{item.title}</span>
                  <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">
                    {item.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
