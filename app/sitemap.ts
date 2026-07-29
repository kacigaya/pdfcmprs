import type { MetadataRoute } from "next";
import { TOOLS } from "./features/pdf/registry";

const BASE_URL = "https://pdfcmprs.netlify.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE_URL, lastModified, priority: 1 },
    ...TOOLS.map((tool) => ({
      url: `${BASE_URL}/${tool.slug}`,
      lastModified,
      priority: 0.8,
    })),
  ];
}
