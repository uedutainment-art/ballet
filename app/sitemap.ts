import type { MetadataRoute } from "next";
import { listPublishedCompetitions } from "@/lib/firebase/queries";
import { toDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// Revalidate hourly so newly-published competitions get indexed quickly
// without rebuilding the whole site.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const competitions = await listPublishedCompetitions({ limit: 1000 });
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/competitions`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const competitionPages: MetadataRoute.Sitemap = competitions.map((c) => {
    const lastModified =
      toDate(c.lastVerifiedAt) ??
      toDate(c.publishedAt) ??
      toDate(c.aiCollectedAt) ??
      now;
    return {
      url: `${SITE_URL}/competitions/${c.id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [...staticPages, ...competitionPages];
}
