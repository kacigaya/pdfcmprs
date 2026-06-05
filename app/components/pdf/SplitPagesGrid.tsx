"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPdfDocument, renderPageToDataUrl } from "../../lib/pdfPreview";
import { parsePageSelection } from "../../features/pdf/services/split";

interface Props {
  file: File;
  selection: string;
  onChange: (selection: string) => void;
}

interface RenderedPage {
  page: number;
  src: string;
}

const MAX_PREVIEW_PAGES = 80;

function formatSelection(pages: Set<number>): string {
  if (pages.size === 0) return "";
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i < sorted.length; i += 1) {
    const v = sorted[i];
    if (v === prev + 1) {
      prev = v;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = v;
    prev = v;
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(", ");
}

export function SplitPagesGrid({ file, selection, onChange }: Props) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPages([]);
    setTotal(0);
    setTruncated(false);
    (async () => {
      try {
        const doc = await loadPdfDocument(file);
        if (!active) {
          await doc.destroy();
          return;
        }
        const totalPages = doc.numPages;
        setTotal(totalPages);
        const limit = Math.min(totalPages, MAX_PREVIEW_PAGES);
        if (totalPages > MAX_PREVIEW_PAGES) setTruncated(true);
        const accumulated: RenderedPage[] = [];
        for (let p = 1; p <= limit; p += 1) {
          if (!active) break;
          const src = await renderPageToDataUrl(doc, p, 0.35);
          if (!active) break;
          accumulated.push({ page: p, src });
          setPages([...accumulated]);
        }
        await doc.destroy();
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Aperçu indisponible.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [file]);

  const selectedSet = useMemo(() => {
    if (!selection.trim() || total === 0) return new Set<number>();
    try {
      return new Set(parsePageSelection(selection, total));
    } catch {
      return new Set<number>();
    }
  }, [selection, total]);

  const togglePage = (page: number): void => {
    const next = new Set(selectedSet);
    if (next.has(page)) next.delete(page);
    else next.add(page);
    onChange(formatSelection(next));
  };

  const selectAll = (): void => {
    if (total === 0) return;
    onChange(`1-${total}`);
  };

  const clear = (): void => onChange("");

  if (error) {
    return (
      <p className="split-grid-error" role="status">
        Preview unavailable · {error}
      </p>
    );
  }

  const skeletonCount =
    total > 0 ? Math.max(0, Math.min(total, MAX_PREVIEW_PAGES) - pages.length) : 6;

  return (
    <div className="split-grid-wrap">
      <div className="split-grid-toolbar">
        <span className="split-grid-meta">
          {total > 0
            ? `${selectedSet.size} / ${total} pages selected`
            : "Loading document…"}
        </span>
        <div className="split-grid-actions">
          <button
            type="button"
            className="button button-icon"
            onClick={selectAll}
            disabled={total === 0}
          >
            Tout
          </button>
          <button
            type="button"
            className="button button-icon"
            onClick={clear}
            disabled={selectedSet.size === 0}
          >
            Aucune
          </button>
        </div>
      </div>
      <div className="split-grid">
        {pages.map(({ page, src }) => {
          const active = selectedSet.has(page);
          return (
            <button
              key={page}
              type="button"
              className="split-grid-cell"
              data-active={active}
              aria-pressed={active}
              aria-label={`Page ${page}`}
              onClick={() => togglePage(page)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="split-grid-thumb" loading="lazy" />
              <span className="split-grid-label">{String(page).padStart(2, "0")}</span>
            </button>
          );
        })}
        {loading && skeletonCount > 0
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`skeleton-${i}`} className="split-grid-cell skeleton" aria-hidden />
            ))
          : null}
      </div>
      {truncated ? (
        <p className="split-grid-note">
          Preview is limited to the first {MAX_PREVIEW_PAGES} pages. The text
          selection field still works for later pages.
        </p>
      ) : null}
    </div>
  );
}
