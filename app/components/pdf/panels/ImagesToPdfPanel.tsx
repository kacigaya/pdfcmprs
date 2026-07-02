"use client";

import { Button } from "@/components/ui/button";
import type { PdfWorkspaceState } from "../../../features/pdf/hooks/usePdfWorkspace";
import { filterImageFiles } from "../../../lib/files";
import { FileUploadZone } from "../FileUploadZone";
import { PanelHeader } from "../PanelHeader";

interface Props {
  workspace: PdfWorkspaceState;
}

export function ImagesToPdfPanel({ workspace }: Props) {
  const { imageFiles } = workspace;
  return (
    <section data-testid="images-to-pdf-panel">
      <PanelHeader
        eyebrow="VI. Images"
        title={
          <>
            Bind <em>the plates</em>
          </>
        }
        lede="Turn JPG, PNG, or WebP images into a PDF. The image order below becomes the page order in the final document."
      />

      <FileUploadZone
        multiple
        files={imageFiles}
        label="Drop your images here"
        hint="JPG, PNG, and WebP supported"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        chooseLabel="Select images"
        filterFiles={filterImageFiles}
        onFiles={workspace.addImageFiles}
        onRemove={workspace.removeImageFile}
        onMove={workspace.moveImageFile}
        onClear={workspace.clearImageFiles}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          disabled={imageFiles.length === 0 || workspace.isRunning}
          loading={workspace.isRunning}
          onClick={workspace.runImagesToPdf}
          data-testid="run-images-to-pdf"
        >
          {workspace.isRunning ? "Creating…" : "Create PDF"}
        </Button>
        {imageFiles.length > 0 ? (
          <Button
            variant="outline"
            onClick={workspace.clearImageFiles}
            disabled={workspace.isRunning}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
