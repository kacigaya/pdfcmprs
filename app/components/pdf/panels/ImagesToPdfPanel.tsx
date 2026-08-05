"use client";

import { Button } from "@/components/ui/button";
import { useFileList } from "../../../features/pdf/hooks/useFiles";
import type { ToolPanelProps } from "../../../features/pdf/registry";
import { imagesToPdf } from "../../../features/pdf/services/imagesToPdf";
import { filterImageFiles } from "../../../lib/files";
import { FileUploadZone } from "../FileUploadZone";

export default function ImagesToPdfPanel({ run }: ToolPanelProps) {
  const list = useFileList(run.reset);

  async function handleRun() {
    if (list.files.length === 0) {
      run.fail("Add at least one image first.");
      return;
    }
    await run.run(async (report) => {
      report(55);
      const out = await imagesToPdf(list.files);
      return {
        blob: out.blob,
        filename: out.filename,
        description: `${out.pageCount} images bound into a PDF.`,
        message: `Conversion complete. ${out.pageCount} pages created.`,
      };
    });
  }

  return (
    <section data-testid="images-to-pdf-panel">
      <FileUploadZone
        multiple
        files={list.files}
        label="Drop your images here"
        hint="JPG, PNG, WebP, BMP, HEIC, TIFF, PSD, and SVG supported"
        accept="image/*,.jpg,.jpeg,.png,.webp,.bmp,.heic,.heif,.tif,.tiff,.psd,.svg"
        chooseLabel="Select images"
        filterFiles={filterImageFiles}
        onFiles={list.onFiles}
        onRemove={list.onRemove}
        onMove={list.onMove}
        onClear={list.onClear}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={list.files.length === 0 || run.isRunning}
          loading={run.isRunning}
          onClick={handleRun}
          data-testid="run-images-to-pdf"
        >
          {run.isRunning ? "Creating…" : "Create PDF"}
        </Button>
        {list.files.length > 0 ? (
          <Button
            variant="outline"
            onClick={list.onClear}
            disabled={run.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
