"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

const formatItems = [
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
];

const qualityItems = [
  { label: "Standard", value: "standard" },
  { label: "High", value: "high" },
  { label: "Maximum", value: "maximum" },
];

const labelClassName =
  "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground";

export function PdfToImagesPanel({ workspace }: Props) {
  const file = workspace.pdfImageFile;
  return (
    <section data-testid="pdf-to-images-panel">
      <PanelHeader
        eyebrow="VII. Render"
        title={
          <>
            Pull <em>the proofs</em>
          </>
        }
        lede="Render every PDF page as PNG or JPG. Multi-page documents download as a ZIP with one image per page."
      />

      <FileUploadZone
        previews
        files={file ? [file] : []}
        label="Drop your PDF here"
        hint="Quality controls the render scale"
        onFiles={(files) => workspace.setPdfImageFile(files[0] ?? null)}
        onRemove={() => workspace.setPdfImageFile(null)}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pdf-image-format" className={labelClassName}>
            Format
          </Label>
          <Select
            items={formatItems}
            value={workspace.pdfImageFormat}
            onValueChange={(value) =>
              workspace.setPdfImageFormat(value === "jpg" ? "jpg" : "png")
            }
          >
            <SelectTrigger id="pdf-image-format">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {formatItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pdf-image-quality" className={labelClassName}>
            Quality
          </Label>
          <Select
            items={qualityItems}
            value={workspace.pdfImageQuality}
            onValueChange={(value) =>
              workspace.setPdfImageQuality(
                value === "standard" || value === "maximum" ? value : "high",
              )
            }
          >
            <SelectTrigger id="pdf-image-quality">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {qualityItems.map((item) => (
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
          disabled={!file || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runPdfToImages}
          data-testid="run-pdf-to-images"
        >
          {workspace.isRunning ? "Rendering…" : "Render Images"}
        </Button>
      </div>
    </section>
  );
}
