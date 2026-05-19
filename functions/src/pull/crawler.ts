import * as cheerio from "cheerio";
import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import type {PullSource} from "./sources";

// Output schema. Mirrors poster-extraction but with a per-item detection
// confidence (how sure the model is that this is actually a real listing,
// not random page noise).
export type CrawlerItem = {
  name: string;
  host: string;
  edition: string | null;
  category:
    | "domestic_major"
    | "domestic_general"
    | "intl_korea_round"
    | "abroad_admission"
    | "regional";
  dateStart: string | null;
  dateEnd: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  venue: string | null;
  sections: string[];
  ageGroups: string[];
  fee: string | null;
  awards: string | null;
  officialUrl: string | null;
  registerUrl: string | null;
  aiConfidence: number;
  aiFieldNotes: Record<string, string>;
  _detectionConfidence: number;
};

const VALID_CATEGORIES: CrawlerItem["category"][] = [
  "domestic_major",
  "domestic_general",
  "intl_korea_round",
  "abroad_admission",
  "regional",
];

const FETCH_TIMEOUT_MS = 12000;
const MAX_TEXT_CHARS = 7000;

// Best-effort fetch. Decodes Korean charsets (EUC-KR fallback) and strips
// nav/script/style so the page-text we send to the LLM is mostly substantive.
export async function fetchSourceText(
  source: PullSource,
): Promise<{text: string; finalUrl: string} | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(source.url, {
      signal: ctl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KBalletBot/1.0; +https://ballet-kappa.vercel.app)",
        "accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      logger.warn("[pull] non-OK", {source: source.id, status: resp.status});
      return null;
    }
    const ct = resp.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) {
      logger.warn("[pull] non-HTML", {source: source.id, contentType: ct});
      return null;
    }

    // Decode with the declared charset (Korean sites still ship EUC-KR).
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

    let body;
    if (source.listSelector) {
      body = $(source.listSelector);
      if (body.length === 0) body = $("body");
    } else {
      body = $("body");
    }
    const text = body.text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);

    return {text, finalUrl: resp.url || source.url};
  } catch (err: unknown) {
    logger.warn("[pull] fetch failed", {
      source: source.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

const SYSTEM_PROMPT = `You extract structured event listings from Korean ballet organization websites.

You will receive the visible text of one organization's webpage. Find ANY future ballet competitions or school admission/audition windows mentioned on the page. Past events should be skipped.

Return STRICT JSON only:
{
  "items": [
    {
      "name": string,
      "host": string,
      "edition": string | null,
      "category": "domestic_major" | "domestic_general" | "intl_korea_round" | "abroad_admission" | "regional",
      "dateStart": string | null,  // YYYY-MM-DD
      "dateEnd": string | null,
      "registrationStart": string | null,
      "registrationEnd": string | null,
      "venue": string | null,
      "sections": string[],
      "ageGroups": string[],
      "fee": string | null,
      "awards": string | null,
      "officialUrl": string | null,
      "registerUrl": string | null,
      "aiConfidence": number,         // 0.0–1.0 confidence in the extracted fields
      "aiFieldNotes": object,         // { fieldName: "한국어 노트" } for unclear fields
      "_detectionConfidence": number  // 0.0–1.0 how sure this is really a ballet event listing (not nav text)
    }
  ]
}

Hard rules:
- NEVER guess dates. Use null + a note when unclear.
- Skip items whose _detectionConfidence would be < 0.5 — i.e. do not return navigation crumbs, blog post titles, generic "공지사항" headlines, or sentences that just MENTION ballet.
- Return {"items": []} if nothing concrete is on the page.
- Korean stays Korean; English stays English.
- For school admission pages, treat the audition / 입학원서 접수 as the event.

Output JSON only.`;

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}
function asArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
}
function asNum(v: unknown, fallback: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}
function asNotes(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim().length > 0) out[k] = val.trim();
  }
  return out;
}

function normalize(raw: unknown): CrawlerItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name);
  const host = asString(r.host);
  if (!name || !host) return null;

  const rawCat = r.category;
  const category: CrawlerItem["category"] =
    typeof rawCat === "string" &&
    VALID_CATEGORIES.includes(rawCat as CrawlerItem["category"]) ?
      (rawCat as CrawlerItem["category"]) :
      "domestic_general";

  return {
    name,
    host,
    edition: asString(r.edition),
    category,
    dateStart: asString(r.dateStart),
    dateEnd: asString(r.dateEnd),
    registrationStart: asString(r.registrationStart),
    registrationEnd: asString(r.registrationEnd),
    venue: asString(r.venue),
    sections: asArr(r.sections),
    ageGroups: asArr(r.ageGroups),
    fee: asString(r.fee),
    awards: asString(r.awards),
    officialUrl: asString(r.officialUrl),
    registerUrl: asString(r.registerUrl),
    aiConfidence: asNum(r.aiConfidence, 0.5),
    aiFieldNotes: asNotes(r.aiFieldNotes),
    _detectionConfidence: asNum(r._detectionConfidence, 0.5),
  };
}

export async function extractItemsFromText(
  source: PullSource,
  pageText: string,
  apiKey: string,
): Promise<CrawlerItem[]> {
  const openai = new OpenAI({apiKey});

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {role: "system", content: SYSTEM_PROMPT},
        {
          role: "user",
          content:
            `Source: ${source.name} (${source.url}) — type: ${source.type}\n\n` +
            `Page text:\n${pageText}`,
        },
      ],
      response_format: {type: "json_object"},
      max_tokens: 2000,
      temperature: 0.1,
    });
  } catch (err: unknown) {
    logger.error("[pull] OpenAI call failed", {
      source: source.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }

  const rawText = resp.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    logger.error("[pull] JSON parse failed", {
      source: source.id,
      sample: rawText.slice(0, 200),
    });
    return [];
  }

  const items = (parsed as {items?: unknown[]})?.items;
  if (!Array.isArray(items)) return [];

  const normalized = items
    .map(normalize)
    .filter((x): x is CrawlerItem => x !== null)
    .filter((x) => x._detectionConfidence >= 0.5);

  logger.info("[pull] extracted", {
    source: source.id,
    raw: items.length,
    kept: normalized.length,
  });
  return normalized;
}
