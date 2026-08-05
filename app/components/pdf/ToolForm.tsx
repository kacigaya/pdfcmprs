"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileList, useFileSlot } from "../../features/pdf/hooks/useFiles";
import type { ToolRun } from "../../features/pdf/hooks/useToolRun";
import type { ToolDefinition } from "../../features/pdf/registry";
import type { ProgressReporter, ToolOutcome } from "../../features/pdf/types";
import { filterPdfFiles } from "../../lib/files";
import { createStoredZip } from "../../lib/zip";
import { FileUploadZone } from "./FileUploadZone";
import { PageGrid } from "./PageGrid";
import {
  OptionsForm,
  useOptions,
  type OptionField,
  type OptionValues,
} from "./OptionsForm";

export interface ToolInputSpec {
  kind: "single" | "multiple";
  /** Run single-file tools once per input and download the results as a ZIP. */
  batch?: boolean;
  label: string;
  hint?: string;
  accept?: string;
  chooseLabel?: string;
  filter?: (files: Iterable<File>) => File[];
  previews?: boolean;
  /** Blocks the run until this many files are present. */
  minFiles?: number;
}

export interface ToolExecuteContext {
  files: File[];
  selection: string;
  values: OptionValues;
  report: ProgressReporter;
}

export interface ToolFormConfig {
  input: ToolInputSpec;
  /** Adds the page-selection field and thumbnail grid. */
  pageSelection?: {
    label?: string;
    hint?: string;
    required?: boolean;
    grid?: boolean;
    /** Seed value, e.g. "all". */
    initial?: string;
  };
  fields?: ReadonlyArray<OptionField>;
  actionLabel: string;
  runningLabel: string;
  /** Extra guard run before execute; return an error string to block. */
  validate?: (context: Omit<ToolExecuteContext, "report">) => string | null;
  execute: (context: ToolExecuteContext) => Promise<ToolOutcome>;
}

const NO_FIELDS: ReadonlyArray<OptionField> = [];

interface ToolFormProps {
  run: ToolRun;
  tool: ToolDefinition;
  config: ToolFormConfig;
}

/**
 * Drives the common tool shape: upload, optional page selection, optional
 * options, one action button. Tools that need bespoke UI render their own
 * panel instead.
 */
export function ToolForm({ run, tool, config }: ToolFormProps) {
  const isMultiple = config.input.kind === "multiple" || config.input.batch;
  const slot = useFileSlot(run.reset);
  const list = useFileList(run.reset);
  const binding = isMultiple ? list : slot;
  const files = binding.files;

  const [selection, setSelection] = useState(config.pageSelection?.initial ?? "");
  const fields = config.fields ?? NO_FIELDS;
  const options = useOptions(fields);

  const preset = tool.preset;
  // Preset values are fixed by the alias slug, so their controls are hidden.
  const visibleFields = useMemo(
    () => (preset ? fields.filter((field) => !(field.name in preset)) : fields),
    [fields, preset],
  );
  const effectiveValues = useMemo(
    () => ({ ...options.values, ...(preset as OptionValues | undefined) }),
    [options.values, preset],
  );

  const minFiles = config.input.minFiles ?? 1;
  const needsSelection = Boolean(config.pageSelection?.required);
  const blocked =
    files.length < minFiles || (needsSelection && !selection.trim());

  async function handleRun() {
    if (files.length < minFiles) {
      run.fail(
        minFiles > 1
          ? `Add at least ${minFiles} files first.`
          : "Add a file first.",
      );
      return;
    }
    if (needsSelection && !selection.trim()) {
      run.fail("Provide a page selection (e.g. 1, 3, 5-7).");
      return;
    }
    const context = { files, selection, values: effectiveValues };
    const problem = config.validate?.(context);
    if (problem) {
      run.fail(problem);
      return;
    }
    await run.run(async (report) => {
      if (!config.input.batch || files.length === 1) {
        return config.execute({ ...context, report });
      }

      const outcomes = [];
      for (let index = 0; index < files.length; index += 1) {
        const outcome = await config.execute({
          ...context,
          files: [files[index]],
          report: (percent) =>
            report(((index + percent / 100) / files.length) * 100),
        });
        outcomes.push(outcome);
      }

      const entries = await Promise.all(
        outcomes.map(async (outcome) => ({
          filename: outcome.filename,
          bytes: outcome.blob
            ? new Uint8Array(await outcome.blob.arrayBuffer())
            : new TextEncoder().encode(outcome.text ?? outcome.description ?? ""),
        })),
      );
      return {
        blob: createStoredZip(entries),
        filename: `${tool.slug}-batch.zip`,
        description: `${outcomes.length} files processed.`,
        message: `Processed ${outcomes.length} files.`,
      };
    });
  }

  return (
    <section data-testid={`${tool.slug}-panel`}>
      <FileUploadZone
        multiple={isMultiple}
        previews={config.input.previews}
        files={files}
        label={config.input.label}
        hint={config.input.hint}
        accept={config.input.accept}
        chooseLabel={config.input.chooseLabel}
        filterFiles={config.input.filter ?? filterPdfFiles}
        onFiles={binding.onFiles}
        onRemove={binding.onRemove}
        onClear={binding.onClear}
        onMove={isMultiple ? list.onMove : undefined}
      />

      {config.pageSelection?.grid !== false && config.pageSelection && files[0] ? (
        <PageGrid
          file={files[0]}
          selection={selection}
          onChange={setSelection}
        />
      ) : null}

      {config.pageSelection ? (
        <div className="mt-6 grid gap-1.5">
          <Label
            htmlFor="page-selection"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            {config.pageSelection.label ?? "Page selection"}
          </Label>
          <Input
            id="page-selection"
            type="text"
            className="font-mono"
            value={selection}
            placeholder="1, 3, 5-7"
            onValueChange={setSelection}
            data-testid="page-selection-input"
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
            {config.pageSelection.hint ??
              "Commas for individual pages · hyphens for ranges · “all” for everything."}
          </p>
        </div>
      ) : null}

      <OptionsForm
        fields={visibleFields}
        values={effectiveValues}
        onChange={options.setValue}
        disabled={run.isRunning}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={blocked || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid={`run-${tool.slug}`}
        >
          {run.isRunning ? config.runningLabel : config.actionLabel}
        </Button>
        {files.length > 0 ? (
          <Button
            variant="outline"
            onClick={binding.onClear}
            disabled={run.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Builds a panel component from a static config — the common case. */
export function createToolPanel(config: ToolFormConfig) {
  return function GeneratedToolPanel({
    run,
    tool,
  }: {
    run: ToolRun;
    tool: ToolDefinition;
  }) {
    return <ToolForm run={run} tool={tool} config={config} />;
  };
}
