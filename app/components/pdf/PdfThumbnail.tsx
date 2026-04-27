"use client";

import { useEffect, useState } from "react";
import { loadPdfDocument, renderPageToDataUrl } from "../../lib/pdfPreview";

interface Props {
  file: File;
  page?: number;
  scale?: number;
  alt?: string;
  className?: string;
}

export function PdfThumbnail({ file, page = 1, scale = 0.4, alt = "", className }: Props) {
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

  const cls = `thumbnail${className ? ` ${className}` : ""}`;
  if (error) return <span className={`${cls} thumbnail--error`} aria-hidden />;
  if (!src) return <span className={`${cls} thumbnail--loading`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={cls} src={src} alt={alt} loading="lazy" />;
}
