"use client";

import { Button } from "@/components/ui/button";
import { useFileList } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import {
  compressPdf,
  type CompressionLevel,
} from "../../../features/pdf/services/compress";
import { FileUploadZone } from "../FileUploadZone";
import { OptionsForm, useOptions, type OptionField } from "../OptionsForm";
import { createStoredZip } from "../../../lib/zip";

// Module scope so useOptions keeps a stable defaults memo across renders.
const COMPRESSION_FIELDS: ReadonlyArray<OptionField> = [
  {
    kind: "select",
    name: "level",
    label: "Compression level",
    default: "balanced",
    options: [
      { label: "Lossless rewrite", value: "lossless" },
      { label: "Light", value: "light" },
      { label: "Balanced", value: "balanced" },
      { label: "Aggressive", value: "aggressive" },
    ],
  },
];

function formatPercent(ratio: number): string {
  return `${Math.max(0, Math.round(ratio * 100))}%`;
}

export default function CompressPanel({ run }: ToolPanelProps) {
  const slot = useFileList(run.reset);
  const options = useOptions(COMPRESSION_FIELDS);
  const level = options.values.level as CompressionLevel;
  const file = slot.files[0];

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      const outputs = [];
      for (let index = 0; index < slot.files.length; index += 1) {
        const out = await compressPdf(slot.files[index], level);
        outputs.push(out);
        report(((index + 1) / slot.files.length) * 95);
      }
      if (outputs.length > 1) {
        return {
          blob: createStoredZip(
            await Promise.all(
              outputs.map(async (out) => ({
                filename: out.filename,
                bytes: new Uint8Array(await out.blob.arrayBuffer()),
              })),
            ),
          ),
          filename: "compressed-pdfs.zip",
          description: `${outputs.length} PDFs compressed and packaged as ZIP.`,
          message: `Compressed ${outputs.length} PDFs.`,
        };
      }
      const out = outputs[0];
      const saved =
        out.originalSize > out.compressedSize
          ? `Saved ${formatPercent(out.ratio)}. ${out.compressedSize} bytes vs ${out.originalSize} bytes.`
          : `No size reduction. Output is ${out.compressedSize} bytes.`;
      return {
        blob: out.blob,
        filename: out.filename,
        description: saved,
        message: `Compression complete. ${saved}`,
      };
    });
  }

  return (
    <section data-testid="compress-panel">
      <FileUploadZone
        multiple
        files={slot.files}
        label="Drop your PDF here"
        hint="Add one PDF, or several for a batch ZIP"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        2. Choose Options
      </p>
      <OptionsForm
        className="mt-2"
        fields={COMPRESSION_FIELDS}
        values={options.values}
        onChange={options.setValue}
        disabled={run.isRunning}
      />

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          3. Process
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="min-w-40 flex-1 sm:flex-none"
            disabled={slot.files.length === 0 || run.isRunning}
            loading={run.isRunning}
            onClick={handleRun}
            data-testid="run-compress"
          >
            {run.isRunning ? "Compressing…" : "Compress PDF"}
          </Button>
          {slot.files.length > 0 ? (
            <Button
              variant="outline"
              onClick={slot.onClear}
              disabled={run.isRunning}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
