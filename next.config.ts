import type { NextConfig } from "next";

/** Old single-page tab ids -> the routes that replaced them. */
const LEGACY_TAB_REDIRECTS: ReadonlyArray<[string, string]> = [
  ["compress", "compress-pdf"],
  ["merge", "merge-pdf"],
  ["split", "split-pdf"],
  ["inspect", "view-metadata"],
  ["extract", "pdf-to-text"],
  ["images-to-pdf", "image-to-pdf"],
  ["pdf-to-images", "pdf-to-image"],
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return LEGACY_TAB_REDIRECTS.map(([from, to]) => ({
      source: `/tools/${from}`,
      destination: `/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
