import type { MetadataRoute } from "next";
import { TOOLS } from "./features/pdf/registry";
import { pageUrl } from "./lib/assets";
import { LEGAL_UPDATED } from "./(legal)/updated";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: pageUrl("/privacy"),
      lastModified: LEGAL_UPDATED,
      priority: 0.3,
    },
    {
      url: pageUrl("/cookies"),
      lastModified: LEGAL_UPDATED,
      priority: 0.3,
    },
    { url: pageUrl("/"), lastModified, priority: 1 },
    ...TOOLS.map((tool) => ({
      url: pageUrl(`/${tool.slug}`),
      lastModified,
      priority: 0.8,
    })),
  ];
}
