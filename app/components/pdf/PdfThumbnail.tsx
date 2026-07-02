"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { loadPdfDocument, renderPageToDataUrl } from "../../lib/pdfPreview";

interface Props {
  file: File;
  page?: number;
  scale?: number;
  alt?: string;
  className?: string;
}

const baseClassName =
  "block aspect-[0.71] w-12 rounded-xs border border-border bg-muted object-cover shadow-xs";

export function PdfThumbnail({
  file,
  page = 1,
  scale = 0.4,
  alt = "",
  className,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc(null);
    setError(false);
    (async () => {
      try {
        const doc = await loadPdfDocument(file);
        const url = await renderPageToDataUrl(doc, page, scale);
        if (active) setSrc(url);
        await doc.destroy();
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [file, page, scale]);

  if (error)
    return (
      <span
        className={cn(
          baseClassName,
          "flex items-center justify-center font-heading italic text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        ?
      </span>
    );
  if (!src)
    return (
      <span
        className={cn(baseClassName, "animate-pulse", className)}
        aria-hidden
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className={cn(baseClassName, className)}
      src={src}
      alt={alt}
      loading="lazy"
    />
  );
}
