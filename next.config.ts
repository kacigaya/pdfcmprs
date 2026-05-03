import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 31536000,
    qualities: [75],
    formats: ["image/webp"],
    localPatterns: [
      { pathname: "/pdfcmprs-banner.png", search: "" },
      { pathname: "/icon.svg", search: "" },
    ],
  },
};

export default nextConfig;
