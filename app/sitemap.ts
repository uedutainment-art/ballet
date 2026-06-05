import type { MetadataRoute } from "next";
import {
  listPublishedAdmissions,
  listPublishedCompetitions,
  listPublishedOrganizations,
  listPublishedPerformances,
  listPublishedVideos,
} from "@/lib/firebase/queries";
import { toDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// Revalidate hourly so newly-published docs get into search engines without
// rebuilding the whole site.
export const revalidate = 3600;

type Item = {
  lastVerifiedAt?: unknown;
  publishedAt?: unknown;
  aiCollectedAt?: unknown;
};

function lastMod(item: Item, now: Date): Date {
  return (
    toDate(item.lastVerifiedAt as never) ??
    toDate(item.publishedAt as never) ??
    toDate(item.aiCollectedAt as never) ??
    now
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Parallel reads — each query is independent of the others.
  const [competitions, admissions, performances, videos, organizations] =
    await Promise.all([
      listPublishedCompetitions({ limit: 1000 }),
      listPublishedAdmissions({ limit: 1000 }),
      listPublishedPerformances({ limit: 1000 }),
      listPublishedVideos({ limit: 1000 }),
      listPublishedOrganizations({ limit: 1000 }),
    ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/competitions`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/admissions`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/performances`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/videos`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/organizations`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const competitionPages: MetadataRoute.Sitemap = competitions.map((c) => ({
    url: `${SITE_URL}/competitions/${c.id}`,
    lastModified: lastMod(c, now),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const admissionPages: MetadataRoute.Sitemap = admissions.map((a) => ({
    url: `${SITE_URL}/admissions/${a.id}`,
    lastModified: lastMod(a, now),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const performancePages: MetadataRoute.Sitemap = performances.map((p) => ({
    url: `${SITE_URL}/performances/${p.id}`,
    lastModified: lastMod(p, now),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const videoPages: MetadataRoute.Sitemap = videos.map((v) => ({
    url: `${SITE_URL}/videos/${v.id}`,
    lastModified: lastMod(v, now),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const orgPages: MetadataRoute.Sitemap = organizations.map((o) => ({
    url: `${SITE_URL}/organizations/${o.id}`,
    // Organizations have updatedAt / publishedAt rather than the standard
    // pipeline fields — coerce through the generic helper.
    lastModified: lastMod(o as unknown as Item, now),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...competitionPages,
    ...admissionPages,
    ...performancePages,
    ...videoPages,
    ...orgPages,
  ];
}
