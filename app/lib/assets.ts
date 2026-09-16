/**
 * Build-time URL prefix for files served from public/. Empty on the VPS; the
 * GitHub Pages workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo>" because
 * project sites live under a sub-path. next/link applies basePath itself, but
 * engine loaders, workers, and the service worker fetch by raw URL and need
 * the prefix spelled out.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfcmprs.duckdns.org";

export function assetUrl(path: `/${string}`): string {
  return BASE_PATH + path;
}

export function pageUrl(path: `/${string}`): string {
  return SITE_URL.replace(/\/$/, "") + path;
}
