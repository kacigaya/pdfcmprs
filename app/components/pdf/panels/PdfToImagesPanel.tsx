"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileSlot } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import {
  pdfToImages,
  type PdfImageFormat,
  type PdfImageQuality,
} from "../../../features/pdf/services/pdfToImages";
import { FileUploadZone } from "../FileUploadZone";

const FORMAT_ITEMS = [
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
];

const QUALITY_ITEMS = [
  { label: "Standard", value: "standard" },
  { label: "High", value: "high" },
  { label: "Maximum", value: "maximum" },
];

const LABEL_CLASS_NAME =
  "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground";

export default function PdfToImagesPanel({ run, tool }: ToolPanelProps) {
  const slot = useFileSlot(run.reset);
  const presetFormat = tool.preset?.format as PdfImageFormat | undefined;
  const [format, setFormat] = useState<PdfImageFormat>(presetFormat ?? "png");
  const [quality, setQuality] = useState<PdfImageQuality>("high");
  const { file } = slot;

  async function handleRun() {
    if (!file) {
      run.fail("Add a PDF file first.");
      return;
    }
    await run.run(async (report) => {
      report(55);
      const out = await pdfToImages(file, format, quality);
      return {
        blob: out.blob,
        filename: out.filename,
        description: out.zipped
          ? `${out.pageCount} ${out.format} files packaged as ZIP.`
          : `One ${out.format} image rendered.`,
        message: `Rendered ${out.pageCount} pages as ${out.format}.`,
      };
    });
  }

  return (
    <section data-testid="pdf-to-images-panel">
      <FileUploadZone
        previews
        files={slot.files}
        label="Drop your PDF here"
        hint="Quality controls the render scale"
        onFiles={slot.onFiles}
        onRemove={slot.onRemove}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {presetFormat ? null : (
          <div className="grid gap-1.5">
            <Label htmlFor="pdf-image-format" className={LABEL_CLASS_NAME}>
              Format
            </Label>
            <Select
              items={FORMAT_ITEMS}
              value={format}
              onValueChange={(value) =>
                setFormat(value === "jpg" ? "jpg" : "png")
              }
            >
              <SelectTrigger id="pdf-image-format">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {FORMAT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="pdf-image-quality" className={LABEL_CLASS_NAME}>
            Quality
          </Label>
          <Select
            items={QUALITY_ITEMS}
            value={quality}
            onValueChange={(value) =>
              setQuality(
                value === "standard" || value === "maximum" ? value : "high",
              )
            }
          >
            <SelectTrigger id="pdf-image-quality">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {QUALITY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={!file || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-pdf-to-images"
        >
          {run.isRunning ? "Rendering…" : "Render Images"}
        </Button>
      </div>
    </section>
  );
}
