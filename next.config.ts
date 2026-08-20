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
  poweredByHeader: false,
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
          // 'unsafe-inline' is required for Next.js RSC payload scripts and the
          // theme bootstrap; script execution via eval/new Function stays
          // blocked (no 'unsafe-eval'), which also neuters pdf.js embedded
          // JavaScript. 'wasm-unsafe-eval' keeps the WASM engines working.
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data: https://rfc3161.ai.moda; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      }];
    },
  }),
};

export default nextConfig;
