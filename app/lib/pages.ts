/**
 * Page-selection parsing shared by every tool that takes a page range
 * (split, rotate, delete, extract, crop, watermark, N-up, ...).
 */
export function parsePageSelection(
  input: string,
  totalPages: number,
): number[] {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error("Selection is empty. Example: 1, 3, 5-7");
  }
  const pages = new Set<number>();
  const normalized = cleaned.replace(/[–—]/g, "-");
  const parts = normalized
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (/^all$/i.test(part)) {
      for (let p = 1; p <= totalPages; p += 1) pages.add(p);
      continue;
    }
    // Open-ended ranges: "5-" means 5..end, "-5" means 1..5.
    const openEnd = part.match(/^(\d+)\s*-$/);
    if (openEnd) {
      const start = Number.parseInt(openEnd[1], 10);
      if (start < 1) throw new Error(`Invalid range: "${part}"`);
      for (let p = start; p <= totalPages; p += 1) pages.add(p);
      continue;
    }
    const openStart = part.match(/^-\s*(\d+)$/);
    if (openStart) {
      const end = Number.parseInt(openStart[1], 10);
      if (end < 1) throw new Error(`Invalid range: "${part}"`);
      for (let p = 1; p <= Math.min(end, totalPages); p += 1) pages.add(p);
      if (end > totalPages) {
        throw new Error(
          `Page ${end} out of bounds (document has ${totalPages} pages).`,
        );
      }
      continue;
    }
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 1 ||
        end < 1
      ) {
        throw new Error(`Invalid range: "${part}"`);
      }
      const [lo, hi] = start <= end ? [start, end] : [end, start];
      for (let p = lo; p <= hi; p += 1) pages.add(p);
      continue;
    }
    const single = Number.parseInt(part, 10);
    if (!Number.isFinite(single) || single < 1 || String(single) !== part) {
      throw new Error(`Invalid page reference: "${part}"`);
    }
    pages.add(single);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  for (const p of sorted) {
    if (p > totalPages) {
      throw new Error(
        `Page ${p} out of bounds (document has ${totalPages} pages).`,
      );
    }
  }
  if (sorted.length === 0) {
    throw new Error("Selection matched no pages.");
  }
  return sorted;
}

/** Every page, 1-based. */
export function allPages(totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/** Turn a sorted page list back into a compact "1-3, 7" string. */
export function formatPageSelection(pages: ReadonlyArray<number>): string {
  if (pages.length === 0) return "";
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const chunks: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current !== prev + 1) {
      chunks.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = current;
    }
    prev = current;
  }
  return chunks.join(", ");
}
