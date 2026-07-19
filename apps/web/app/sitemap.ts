import type { MetadataRoute } from "next";
import { getLastUpdated } from "../lib/last-updated";
import { getSiteUrl } from "../lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getSiteUrl(),
      lastModified: getLastUpdated().iso,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
