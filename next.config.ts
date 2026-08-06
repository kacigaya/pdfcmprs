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

const staticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  ...(staticExport ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  turbopack: {
    resolveAlias: {
      // coherentpdf's js_of_ocaml output references Node's fs in a code path
      // the browser never reaches. See app/lib/wasm/nodeStub.ts.
      fs: { browser: "./app/lib/wasm/nodeStub.ts" },
    },
  },
  ...(staticExport ? {} : {
    async redirects() {
      return LEGACY_TAB_REDIRECTS.map(([from, to]) => ({ source: `/tools/${from}`, destination: `/${to}`, permanent: true }));
    },
    async headers() {
      return [{
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      }];
    },
  }),
};

export default nextConfig;
