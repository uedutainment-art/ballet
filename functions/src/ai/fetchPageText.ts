import * as logger from "firebase-functions/logger";

// Best-effort fetch of an external URL. Returns cleaned page text (HTML
// stripped, capped) or null if missing / fetch fails / content not HTML.
// Never throws — callers degrade gracefully.

const FETCH_TIMEOUT_MS = 10000;
const MAX_CHARS = 12000;

export async function fetchPageText(
  rawUrl?: string | null,
): Promise<string | null> {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(rawUrl, {
      signal: ctl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KBalletBot/1.0; +https://ballet-kappa.vercel.app)",
        "accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      logger.info("[fetchPageText] non-OK", {
        url: rawUrl,
        status: resp.status,
      });
      return null;
    }
    const ct = resp.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) {
      logger.info("[fetchPageText] non-HTML", {url: rawUrl, contentType: ct});
      return null;
    }

    // Honor declared charset for legacy Korean sites.
    const charsetMatch = ct.match(/charset=([^;]+)/i);
    const charset = (charsetMatch?.[1] || "utf-8").toLowerCase();
    const buf = await resp.arrayBuffer();
    let html: string;
    try {
      html = new TextDecoder(charset).decode(buf);
    } catch {
      html = new TextDecoder("utf-8").decode(buf);
    }

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length === 0) return null;
    return cleaned.slice(0, MAX_CHARS);
  } catch (err: unknown) {
    logger.info("[fetchPageText] failed", {
      url: rawUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
