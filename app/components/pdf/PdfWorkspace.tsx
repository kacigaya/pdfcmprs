"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import {
  type ToolId,
  usePdfWorkspace,
} from "../../features/pdf/hooks/usePdfWorkspace";
import { CompressPanel } from "./panels/CompressPanel";
import { ExtractTextPanel } from "./panels/ExtractTextPanel";
import { ImagesToPdfPanel } from "./panels/ImagesToPdfPanel";
import { InspectPanel } from "./panels/InspectPanel";
import { MergePanel } from "./panels/MergePanel";
import { PdfToImagesPanel } from "./panels/PdfToImagesPanel";
import { SplitPanel } from "./panels/SplitPanel";
import { ResultCard } from "./ResultCard";

interface ToolDefinition {
  id: ToolId;
  numeral: string;
  label: string;
}

const tools: ReadonlyArray<ToolDefinition> = [
  { id: "compress", numeral: "I", label: "Compress" },
  { id: "merge", numeral: "II", label: "Merge" },
  { id: "split", numeral: "III", label: "Split" },
  { id: "inspect", numeral: "IV", label: "Inspect" },
  { id: "extract", numeral: "V", label: "Text" },
  { id: "images-to-pdf", numeral: "VI", label: "Images" },
  { id: "pdf-to-images", numeral: "VII", label: "Render" },
];

export function PdfWorkspace() {
  const workspace = usePdfWorkspace();

  return (
    <>
      <section className="mb-8 animate-rise-in">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Browser PDF toolkit
        </p>
        <h1 className="mt-2 max-w-[22ch] font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          PDF tools that stay{" "}
          <em className="italic text-primary">on your device</em>
        </h1>
        <p className="mt-3 max-w-[52ch] font-heading italic text-lg leading-normal text-muted-foreground">
          Compress, merge, split, inspect, extract text, and convert — all
          processed in your browser. Nothing is uploaded.
        </p>
      </section>

      <Tabs
        value={workspace.tool}
        onValueChange={(value) => workspace.setTool(value as ToolId)}
      >
        <div className="mb-6 overflow-x-auto border-y border-border">
          <TabsList
            variant="underline"
            className="w-max min-w-full justify-start gap-1"
            aria-label="PDF tools"
          >
            {tools.map((tool) => (
              <TabsTab
                key={tool.id}
                value={tool.id}
                data-testid={`tab-${tool.id}`}
                className="grow-0 gap-2 px-3"
              >
                <span
                  className="font-heading italic text-primary"
                  aria-hidden
                >
                  {tool.numeral}.
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.18em]">
                  {tool.label}
                </span>
              </TabsTab>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="animate-rise-in p-5 sm:p-7">
          {workspace.tool === "compress" ? (
            <CompressPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "merge" ? (
            <MergePanel workspace={workspace} />
          ) : null}
          {workspace.tool === "split" ? (
            <SplitPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "inspect" ? (
            <InspectPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "extract" ? (
            <ExtractTextPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "images-to-pdf" ? (
            <ImagesToPdfPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "pdf-to-images" ? (
            <PdfToImagesPanel workspace={workspace} />
          ) : null}
        </Card>
        <ResultCard
          status={workspace.status}
          progress={workspace.progress}
          result={workspace.result}
          isRunning={workspace.isRunning}
        />
      </div>
    </>
  );
}
