"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Combine,
  FileImage,
  FileOutput,
  FilePenLine,
  Files,
  FileText,
  LockKeyhole,
  Search,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  TOOLS,
  type ToolDefinition,
} from "../../features/pdf/registry";
import { copy, useSettings } from "../../lib/settings";

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

const POPULAR_SLUGS = [
  "compress-pdf",
  "merge-pdf",
  "split-pdf",
  "pdf-editor",
  "sign-pdf",
  "pdf-to-jpg",
] as const;

const CATEGORY_ICONS: Record<ToolDefinition["category"], LucideIcon> = {
  organize: Files,
  edit: FilePenLine,
  secure: LockKeyhole,
  "to-pdf": FileText,
  "from-pdf": FileOutput,
  automate: Workflow,
};

function toolIcon(tool: ToolDefinition): LucideIcon {
  if (tool.slug === "merge-pdf") return Combine;
  if (tool.slug.includes("image") || tool.slug.includes("jpg"))
    return FileImage;
  return CATEGORY_ICONS[tool.category];
}

function ToolCard({
  tool,
  popular = false,
}: {
  tool: ToolDefinition;
  popular?: boolean;
}) {
  const Icon = toolIcon(tool);
  return (
    <Card
      className="group h-full transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary hover:bg-card/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring"
      render={
        <Link
          href={`/${tool.slug}`}
          data-testid={
            popular ? `popular-tool-${tool.slug}` : `tool-card-${tool.slug}`
          }
        />
      }
    >
      <div className="flex h-full gap-3 p-4">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-heading text-lg leading-tight">{tool.title}</h3>
          <p className="mt-1 line-clamp-2 text-pretty text-sm leading-normal text-muted-foreground">
            {tool.summary}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ToolCatalog() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [settings] = useSettings();
  const words = copy(settings.language);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "category",
    );
    if (requested && CATEGORIES.some((category) => category.id === requested)) {
      setCategoryId(requested);
    }
  }, []);

  const groups = useMemo(() => {
    const visible = TOOLS.filter(
      (tool) =>
        matches(tool, query) &&
        (categoryId === "all" || tool.category === categoryId),
    );
    return CATEGORIES.map((category) => ({
      category,
      tools: visible.filter((tool) => tool.category === category.id),
    })).filter((group) => group.tools.length > 0);
  }, [categoryId, query]);

  const total = groups.reduce((sum, group) => sum + group.tools.length, 0);
  const popular = POPULAR_SLUGS.map((slug) =>
    TOOLS.find((tool) => tool.slug === slug),
  ).filter((tool): tool is ToolDefinition => Boolean(tool));

  return (
    <>
      <section className="mb-8" aria-labelledby="popular-tools">
        <div className="mb-4 border-b border-border pb-2">
          <h2
            id="popular-tools"
            className="font-heading text-2xl leading-tight tracking-tight"
          >
            Popular tools
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Common jobs, one click away.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} popular />
            </li>
          ))}
        </ul>
      </section>

      <div
        id="catalog"
        className="mb-8 scroll-mt-24 border-y border-border py-5"
      >
        <label htmlFor="tool-search" className="sr-only">
          {words.search}
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
            placeholder={`${words.search}: rotate, watermark, OCR`}
            className="ps-9"
            data-testid="tool-search"
          />
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter tools by category"
        >
          <Button
            size="sm"
            variant={categoryId === "all" ? "default" : "outline"}
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              size="sm"
              variant={categoryId === category.id ? "default" : "outline"}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.label.replace(/ & .*/, "")}
            </Button>
          ))}
        </div>
        <p
          className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          aria-live="polite"
        >
          {total} {words.tools} {query ? words.matched : words.available}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-pretty font-heading italic leading-normal text-muted-foreground">
          Nothing matched “{query}”. Try a different term.
        </p>
      ) : null}

      <div className="space-y-10">
        {groups.map(({ category, tools }) => (
          <section
            key={category.id}
            aria-labelledby={`category-${category.id}`}
          >
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
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
