"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  TOOLS,
  type ToolDefinition,
} from "../../features/pdf/registry";

function matches(tool: ToolDefinition, query: string): boolean {
  if (!query) return true;
  const haystack = [tool.title, tool.summary, tool.slug, ...tool.keywords]
    .join(" ")
    .toLowerCase();
  // Every whitespace-separated term must appear somewhere.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function ToolCatalog() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const visible = TOOLS.filter((tool) => matches(tool, query));
    return CATEGORIES.map((category) => ({
      category,
      tools: visible.filter((tool) => tool.category === category.id),
    })).filter((group) => group.tools.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.tools.length, 0);

  return (
    <>
      <div className="mb-8">
        <label htmlFor="tool-search" className="sr-only">
          Search tools
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="tool-search"
            type="search"
            value={query}
            onValueChange={setQuery}
            placeholder="Search tools — rotate, watermark, ocr…"
            className="ps-9"
            data-testid="tool-search"
          />
        </div>
        <p
          className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          aria-live="polite"
        >
          {total} {total === 1 ? "tool" : "tools"}
          {query ? " matched" : " available"}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-pretty font-heading italic leading-normal text-muted-foreground">
          Nothing matched “{query}”. Try a different term.
        </p>
      ) : null}

      <div className="space-y-10">
        {groups.map(({ category, tools }) => (
          <section key={category.id} aria-labelledby={`category-${category.id}`}>
            <div className="mb-4 border-b border-border pb-2">
              <h2
                id={`category-${category.id}`}
                className="font-heading text-2xl leading-tight tracking-tight"
              >
                {category.label}
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {category.summary}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <Card
                    className="h-full animate-rise-in transition-colors hover:border-primary"
                    render={
                      <Link href={`/${tool.slug}`} data-testid={`tool-card-${tool.slug}`} />
                    }
                  >
                    <div className="flex h-full flex-col p-4">
                      <h3 className="font-heading text-lg leading-tight">
                        {tool.title}
                      </h3>
                      <p className="mt-1.5 text-pretty text-sm leading-normal text-muted-foreground">
                        {tool.summary}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
