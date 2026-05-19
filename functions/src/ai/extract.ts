import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import {COMPETITION_EXTRACTION_PROMPT} from "./prompts";

export type CompetitionCategory =
  | "domestic_major"
  | "domestic_general"
  | "intl_korea_round"
  | "abroad_admission"
  | "regional";

export type ExtractionResult = {
  name: string;
  host: string;
  edition: string | null;
  category: CompetitionCategory;
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
};

const VALID_CATEGORIES: CompetitionCategory[] = [
  "domestic_major",
  "domestic_general",
  "intl_korea_round",
  "abroad_admission",
  "regional",
];

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
}

function asConfidence(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

function asNoteMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim().length > 0) {
      out[k] = val.trim();
    }
  }
  return out;
}

function normalize(raw: unknown): ExtractionResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const name = asString(r.name);
  const host = asString(r.host);
  if (!name || !host) return null;

  const rawCategory = r.category;
  const category: CompetitionCategory =
    typeof rawCategory === "string" &&
    VALID_CATEGORIES.includes(rawCategory as CompetitionCategory) ?
      (rawCategory as CompetitionCategory) :
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
    sections: asStringArray(r.sections),
    ageGroups: asStringArray(r.ageGroups),
    fee: asString(r.fee),
    awards: asString(r.awards),
    officialUrl: asString(r.officialUrl),
    registerUrl: asString(r.registerUrl),
    aiConfidence: asConfidence(r.aiConfidence),
    aiFieldNotes: asNoteMap(r.aiFieldNotes),
  };
}

export type ExtractionOutcome =
  | { ok: true; data: ExtractionResult; rawText: string }
  | { ok: false; rawText: string; error: string };

export async function extractCompetitionFromImage(
  imageUrl: string,
  apiKey: string,
): Promise<ExtractionOutcome> {
  const openai = new OpenAI({apiKey});

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {type: "text", text: COMPETITION_EXTRACTION_PROMPT},
            {
              type: "image_url",
              image_url: {url: imageUrl, detail: "high"},
            },
          ],
        },
      ],
      response_format: {type: "json_object"},
      max_tokens: 1500,
      temperature: 0.1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[extract] OpenAI call failed", {error: msg});
    return {ok: false, rawText: "", error: msg};
  }

  const rawText = resp.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {ok: false, rawText, error: "JSON parse failed"};
  }

  const normalized = normalize(parsed);
  if (!normalized) {
    return {
      ok: false,
      rawText,
      error: "Missing required fields (name, host)",
    };
  }

  logger.info("[extract] OK", {
    name: normalized.name,
    confidence: normalized.aiConfidence,
  });
  return {ok: true, data: normalized, rawText};
}
