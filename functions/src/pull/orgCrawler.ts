// Per-org-per-domain pull crawler (M11).
//
// Flow:
//   1. Fetch the board page HTML.
//   2. Use cheerio to extract candidate article links (absolute, same-host,
//      length-filtered to drop nav/menu/footer noise).
//   3. Apply org-specific exclude pattern + dedupe against seen URL hashes.
//   4. Cap at MAX_NEW_PER_DOMAIN to avoid blowing the AI budget on a stale
//      board with hundreds of unseen URLs.
//   5. For each URL: fetch its body text, hand to the domain extractor,
//      write a DRAFT with crawlMeta back-pointer.
//   6. Return a CrawlOrgResult the run-tracker can persist.
//
// On any thrown error we capture errorMessage and return — the scheduler
// keeps going for other orgs.

import {createHash} from "node:crypto";
import * as cheerio from "cheerio";
import * as logger from "firebase-functions/logger";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {
  extractAdmission,
  extractCompetition,
  extractPerformance,
  type AdmissionExtractionResult,
  type ExtractionResult,
  type PerformanceExtractionResult,
} from "../ai/extract";
import type {CrawlDomain, CrawlOrgResult} from "./crawlRun";

const FETCH_TIMEOUT_MS = 12000;
const MAX_ARTICLE_CHARS = 8000;
const MAX_NEW_PER_DOMAIN = 8; // safety cap per org per domain
const MIN_LINK_TEXT_LENGTH = 6; // skip "더보기", "Home" etc.

type FetchedPage = {text: string; html: string; finalUrl: string};

async function fetchPage(
  url: string,
  userAgent?: string,
): Promise<FetchedPage | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      signal: ctl.signal,
      headers: {
        "user-agent":
          userAgent ??
          "Mozilla/5.0 (compatible; KBalletBot/1.0; +https://ballet-kappa.vercel.app)",
        "accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      logger.info("[orgCrawler] non-OK", {url, status: resp.status});
      return null;
    }
    const ct = resp.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) {
      logger.info("[orgCrawler] non-HTML", {url, contentType: ct});
      return null;
    }

    const charsetMatch = ct.match(/charset=([^;]+)/i);
    const charset = (charsetMatch?.[1] || "utf-8").toLowerCase();
    const buf = await resp.arrayBuffer();
    let html: string;
    try {
      html = new TextDecoder(charset).decode(buf);
    } catch {
      html = new TextDecoder("utf-8").decode(buf);
    }

    const $ = cheerio.load(html);
    $("script, style, noscript, nav, header, footer, iframe").remove();
    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ARTICLE_CHARS);

    return {text, html, finalUrl: resp.url || url};
  } catch (err: unknown) {
    logger.warn("[orgCrawler] fetch failed", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// Extract candidate article links from a board page. Heuristics:
//   - <a href> only
//   - resolved to absolute URL relative to the board page
//   - same-host (or http(s) at all if same-host filter fails)
//   - href has at least one path segment beyond "/"
//   - visible link text length >= MIN_LINK_TEXT_LENGTH (drops nav crumbs)
//   - drop fragment-only / mailto / javascript / # links
// Returns absolute URLs in document order, deduped.
function extractArticleLinks(html: string, boardUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(boardUrl);
  const seen = new Set<string>();
  const out: string[] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href) return;
    if (/^(mailto:|javascript:|#)/i.test(href)) return;

    let abs: URL;
    try {
      abs = new URL(href, base);
    } catch {
      return;
    }
    if (!/^https?:$/.test(abs.protocol)) return;
    // Drop fragment-only differences vs board page itself.
    if (abs.href === boardUrl) return;
    // Drop pure hash links.
    if (abs.pathname === base.pathname && !abs.search && abs.hash) return;

    // Same-host preferred; otherwise still allow (some boards link to
    // a separate subdomain for posts).
    const sameHost = abs.hostname === base.hostname;
    // Path must have meaningful segments.
    const segs = abs.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return;

    const text = ($(el).text() || "").replace(/\s+/g, " ").trim();
    if (!sameHost && text.length < MIN_LINK_TEXT_LENGTH) return;
    if (text.length > 0 && text.length < MIN_LINK_TEXT_LENGTH) return;

    if (seen.has(abs.href)) return;
    seen.add(abs.href);
    out.push(abs.href);
  });

  return out;
}

function hashUrl(url: string): string {
  return createHash("sha256")
    .update(url.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function dateOrNull(s: string | null): Timestamp | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return Timestamp.fromDate(
    new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
}

type ExtractDomain = CrawlDomain;

async function runDomainExtractor(
  domain: ExtractDomain,
  pageText: string,
  apiKey: string,
): Promise<
  | ExtractionResult
  | AdmissionExtractionResult
  | PerformanceExtractionResult
  | null
> {
  switch (domain) {
  case "competition": {
    const r = await extractCompetition({supplementText: pageText}, apiKey);
    return r.ok ? r.data : null;
  }
  case "admission": {
    const r = await extractAdmission({supplementText: pageText}, apiKey);
    return r.ok ? r.data : null;
  }
  case "performance": {
    const r = await extractPerformance({supplementText: pageText}, apiKey);
    return r.ok ? r.data : null;
  }
  }
}

function buildCompetitionDraft(
  data: ExtractionResult,
  meta: {crawlRunId: string; orgId: string; orgName: string; url: string},
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    status: "DRAFT",
    category: data.category,
    source: "pull",
    name: data.name,
    host: data.host,
    venue: data.venue ?? "",
    sections: data.sections,
    ageGroups: data.ageGroups,
    officialUrl: data.officialUrl ?? meta.url,
    aiConfidence: data.aiConfidence,
    aiFieldNotes: data.aiFieldNotes,
    hostOrgId: meta.orgId,
    crawlMeta: {
      crawlRunId: meta.crawlRunId,
      sourceOrgId: meta.orgId,
      sourceOrgName: meta.orgName,
      sourceUrl: meta.url,
      fetchedAt: Timestamp.now(),
    },
    aiCollectedAt: FieldValue.serverTimestamp(),
  };
  if (data.edition) doc.edition = data.edition;
  if (data.fee) doc.fee = data.fee;
  if (data.awards) doc.awards = data.awards;
  if (data.registerUrl) doc.registerUrl = data.registerUrl;
  const ds = dateOrNull(data.dateStart);
  const de = dateOrNull(data.dateEnd);
  const rs = dateOrNull(data.registrationStart);
  const re = dateOrNull(data.registrationEnd);
  if (ds) doc.dateStart = ds;
  if (de) doc.dateEnd = de;
  if (rs) doc.registrationStart = rs;
  if (re) doc.registrationEnd = re;
  return doc;
}

function buildAdmissionDraft(
  data: AdmissionExtractionResult,
  meta: {crawlRunId: string; orgId: string; orgName: string; url: string},
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    status: "DRAFT",
    source: "pull",
    schoolName: data.schoolName,
    schoolType: data.schoolType,
    department: data.department,
    year: data.year,
    subjects: data.subjects,
    csat: data.csat,
    officialUrl: data.officialUrl ?? meta.url,
    aiConfidence: data.aiConfidence,
    aiFieldNotes: data.aiFieldNotes,
    schoolOrgId: meta.orgId,
    crawlMeta: {
      crawlRunId: meta.crawlRunId,
      sourceOrgId: meta.orgId,
      sourceOrgName: meta.orgName,
      sourceUrl: meta.url,
      fetchedAt: Timestamp.now(),
    },
    aiCollectedAt: FieldValue.serverTimestamp(),
  };
  if (data.capacity !== null) doc.capacity = data.capacity;
  if (data.fee) doc.fee = data.fee;
  if (data.guidelineUrl) doc.guidelineUrl = data.guidelineUrl;
  const rs = dateOrNull(data.regStart);
  const re = dateOrNull(data.regEnd);
  const p1 = dateOrNull(data.practical1);
  const p2 = dateOrNull(data.practical2);
  const ann = dateOrNull(data.announcementAt);
  if (rs) doc.regStart = rs;
  if (re) doc.regEnd = re;
  if (p1) doc.practical1 = p1;
  if (p2) doc.practical2 = p2;
  if (ann) doc.announcementAt = ann;
  return doc;
}

function buildPerformanceDraft(
  data: PerformanceExtractionResult,
  meta: {crawlRunId: string; orgId: string; orgName: string; url: string},
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    status: "DRAFT",
    source: "pull",
    title: data.title,
    company: data.company,
    companyType: data.companyType,
    venue: data.venue ?? "",
    showtimes: data.showtimes,
    officialUrl: data.officialUrl ?? meta.url,
    aiConfidence: data.aiConfidence,
    aiFieldNotes: data.aiFieldNotes,
    companyOrgId: meta.orgId,
    crawlMeta: {
      crawlRunId: meta.crawlRunId,
      sourceOrgId: meta.orgId,
      sourceOrgName: meta.orgName,
      sourceUrl: meta.url,
      fetchedAt: Timestamp.now(),
    },
    aiCollectedAt: FieldValue.serverTimestamp(),
  };
  if (data.ticketPriceMin !== null) doc.ticketPriceMin = data.ticketPriceMin;
  if (data.ticketPriceMax !== null) doc.ticketPriceMax = data.ticketPriceMax;
  if (data.ticketUrl) doc.ticketUrl = data.ticketUrl;
  if (data.description) doc.description = data.description;
  if (data.choreographer) doc.choreographer = data.choreographer;
  if (data.composer) doc.composer = data.composer;
  if (data.runtime !== null) doc.runtime = data.runtime;
  if (data.ageLimit) doc.ageLimit = data.ageLimit;
  if (data.posterUrl) doc.posterUrl = data.posterUrl;
  const ds = dateOrNull(data.dateStart);
  const de = dateOrNull(data.dateEnd);
  if (ds) doc.dateStart = ds;
  if (de) doc.dateEnd = de;
  return doc;
}

const COLLECTION_BY_DOMAIN: Record<CrawlDomain, string> = {
  competition: "competitions",
  admission: "admissions",
  performance: "performances",
};

export type RunCrawlForOrgParams = {
  runId: string;
  orgId: string;
  orgName: string;
  domain: CrawlDomain;
  boardUrl: string;
  excludePattern?: string;
  userAgent?: string;
  seenHashes: string[];
  apiKey: string;
};

export async function runCrawlForOrg(
  params: RunCrawlForOrgParams,
): Promise<{result: CrawlOrgResult; newSeenHashes: string[]}> {
  const startedAt = Date.now();
  const newSeenHashes: string[] = [];

  const baseResult: Omit<CrawlOrgResult, "durationMs"> = {
    orgId: params.orgId,
    orgName: params.orgName,
    domain: params.domain,
    boardUrl: params.boardUrl,
    urlsFetched: 0,
    newItemsCreated: 0,
    skippedDuplicates: 0,
    aiCallsUsed: 0,
  };

  try {
    const board = await fetchPage(params.boardUrl, params.userAgent);
    if (!board) {
      return {
        result: {
          ...baseResult,
          durationMs: Date.now() - startedAt,
          errorMessage: "게시판 페이지를 불러오지 못했어요 (차단·404·비-HTML)",
        },
        newSeenHashes,
      };
    }

    const allLinks = extractArticleLinks(board.html, board.finalUrl);
    baseResult.urlsFetched = allLinks.length;

    let filtered = allLinks;
    if (params.excludePattern) {
      try {
        const re = new RegExp(params.excludePattern);
        filtered = filtered.filter((u) => !re.test(u));
      } catch (err) {
        logger.warn("[orgCrawler] bad excludePattern", {
          pattern: params.excludePattern,
          err,
        });
      }
    }

    const seen = new Set(params.seenHashes);
    const unseen: string[] = [];
    for (const url of filtered) {
      const h = hashUrl(url);
      if (seen.has(h)) continue;
      unseen.push(url);
    }
    baseResult.skippedDuplicates = filtered.length - unseen.length;
    const work = unseen.slice(0, MAX_NEW_PER_DOMAIN);

    const db = getFirestore();
    const collection = COLLECTION_BY_DOMAIN[params.domain];
    const sampleUrls: string[] = [];

    for (const articleUrl of work) {
      const article = await fetchPage(articleUrl, params.userAgent);
      if (!article || article.text.length < 200) {
        // Still record the hash so we don't keep retrying junky pages.
        newSeenHashes.push(hashUrl(articleUrl));
        continue;
      }

      baseResult.aiCallsUsed += 1;
      const extracted = await runDomainExtractor(
        params.domain,
        article.text,
        params.apiKey,
      );
      newSeenHashes.push(hashUrl(articleUrl));

      if (!extracted) {
        logger.info("[orgCrawler] extraction empty", {
          orgId: params.orgId,
          articleUrl,
        });
        continue;
      }

      let doc: Record<string, unknown>;
      if (params.domain === "competition") {
        doc = buildCompetitionDraft(extracted as ExtractionResult, {
          crawlRunId: params.runId,
          orgId: params.orgId,
          orgName: params.orgName,
          url: articleUrl,
        });
      } else if (params.domain === "admission") {
        doc = buildAdmissionDraft(extracted as AdmissionExtractionResult, {
          crawlRunId: params.runId,
          orgId: params.orgId,
          orgName: params.orgName,
          url: articleUrl,
        });
      } else {
        doc = buildPerformanceDraft(
          extracted as PerformanceExtractionResult,
          {
            crawlRunId: params.runId,
            orgId: params.orgId,
            orgName: params.orgName,
            url: articleUrl,
          },
        );
      }

      try {
        const ref = await db.collection(collection).add(doc);
        baseResult.newItemsCreated += 1;
        sampleUrls.push(articleUrl);
        logger.info("[orgCrawler] DRAFT created", {
          orgId: params.orgId,
          domain: params.domain,
          docId: ref.id,
          articleUrl,
        });
      } catch (err) {
        logger.warn("[orgCrawler] write failed", {
          orgId: params.orgId,
          articleUrl,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      result: {
        ...baseResult,
        durationMs: Date.now() - startedAt,
        sampleUrls: sampleUrls.slice(0, 5),
      },
      newSeenHashes,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[orgCrawler] unexpected error", {
      orgId: params.orgId,
      domain: params.domain,
      msg,
    });
    return {
      result: {
        ...baseResult,
        durationMs: Date.now() - startedAt,
        errorMessage: msg,
      },
      newSeenHashes,
    };
  }
}
