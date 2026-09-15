import type { MetadataRoute } from "next";
import { TOOLS } from "./features/pdf/registry";

export const dynamic = "force-static";

const BASE_URL = "https://pdfcmprs.duckdns.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: "https://pdfcmprs.duckdns.org/privacy",
      lastModified: "2026-09-15",
      priority: 0.3,
    },
    {
      url: "https://pdfcmprs.duckdns.org/cookies",
      lastModified: "2026-09-15",
      priority: 0.3,
    },
    { url: BASE_URL, lastModified, priority: 1 },
    ...TOOLS.map((tool) => ({
      url: `${BASE_URL}/${tool.slug}`,
      lastModified,
      priority: 0.8,
    })),
  ];
}
