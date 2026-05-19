import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import {
  ADMISSION_EXTRACTION_PROMPT,
  COMPETITION_EXTRACTION_PROMPT,
  PERFORMANCE_EXTRACTION_PROMPT,
} from "./prompts";

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

export type ExtractionInput = {
  imageDataUrl?: string;
  supplementText?: string | null;
};

// Unified extractor. Accepts an image data URL, supplementary text, or both.
// At least one is required; if neither is provided we return an error.

export async function extractCompetition(
  input: ExtractionInput,
  apiKey: string,
): Promise<ExtractionOutcome> {
  if (!input.imageDataUrl && !(input.supplementText?.trim())) {
    return {
      ok: false,
      rawText: "",
      error: "No input — pass imageDataUrl, supplementText, or both",
    };
  }

  const openai = new OpenAI({apiKey});
  const content: Array<
    | {type: "text"; text: string}
    | {type: "image_url"; image_url: {url: string; detail: "high"}}
  > = [{type: "text", text: COMPETITION_EXTRACTION_PROMPT}];

  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: {url: input.imageDataUrl, detail: "high"},
    });
  }
  if (input.supplementText && input.supplementText.trim().length > 0) {
    content.push({
      type: "text",
      text: "\n\nSOURCE TEXT:\n\n" + input.supplementText,
    });
  }

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{role: "user", content}],
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

// Backward-compat wrapper for extractFromPoster.ts.
export async function extractCompetitionFromImage(
  imageUrl: string,
  apiKey: string,
  supplementText?: string | null,
): Promise<ExtractionOutcome> {
  return extractCompetition(
    {imageDataUrl: imageUrl, supplementText: supplementText ?? undefined},
    apiKey,
  );
}

// ---------- Admission extraction (M7) ----------

export type AdmissionSchoolType = "middle" | "high" | "university" | "grad";
export type AdmissionCsat =
  | "reflected"
  | "not_reflected"
  | "reference_only";

export type AdmissionExtractionResult = {
  schoolName: string;
  department: string;
  schoolType: AdmissionSchoolType;
  year: number;
  capacity: number | null;
  regStart: string | null;
  regEnd: string | null;
  practical1: string | null;
  practical2: string | null;
  announcementAt: string | null;
  subjects: string[];
  csat: AdmissionCsat;
  fee: string | null;
  guidelineUrl: string | null;
  officialUrl: string | null;
  aiConfidence: number;
  aiFieldNotes: Record<string, string>;
};

export type AdmissionExtractionOutcome =
  | { ok: true; data: AdmissionExtractionResult; rawText: string }
  | { ok: false; rawText: string; error: string };

const VALID_SCHOOL_TYPES: AdmissionSchoolType[] = [
  "middle",
  "high",
  "university",
  "grad",
];

const VALID_CSAT: AdmissionCsat[] = [
  "reflected",
  "not_reflected",
  "reference_only",
];

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function normalizeAdmission(
  raw: unknown,
): AdmissionExtractionResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const schoolName = asString(r.schoolName);
  const department = asString(r.department);
  const year = asInt(r.year);
  if (!schoolName || !department || !year) return null;

  const rawType = r.schoolType;
  const schoolType: AdmissionSchoolType =
    typeof rawType === "string" &&
    VALID_SCHOOL_TYPES.includes(rawType as AdmissionSchoolType) ?
      (rawType as AdmissionSchoolType) :
      "university";

  const rawCsat = r.csat;
  const csat: AdmissionCsat =
    typeof rawCsat === "string" &&
    VALID_CSAT.includes(rawCsat as AdmissionCsat) ?
      (rawCsat as AdmissionCsat) :
      "not_reflected";

  return {
    schoolName,
    department,
    schoolType,
    year,
    capacity: asInt(r.capacity),
    regStart: asString(r.regStart),
    regEnd: asString(r.regEnd),
    practical1: asString(r.practical1),
    practical2: asString(r.practical2),
    announcementAt: asString(r.announcementAt),
    subjects: asStringArray(r.subjects),
    csat,
    fee: asString(r.fee),
    guidelineUrl: asString(r.guidelineUrl),
    officialUrl: asString(r.officialUrl),
    aiConfidence: asConfidence(r.aiConfidence),
    aiFieldNotes: asNoteMap(r.aiFieldNotes),
  };
}

export async function extractAdmission(
  input: ExtractionInput,
  apiKey: string,
): Promise<AdmissionExtractionOutcome> {
  if (!input.imageDataUrl && !(input.supplementText?.trim())) {
    return {
      ok: false,
      rawText: "",
      error: "No input — pass imageDataUrl, supplementText, or both",
    };
  }

  const openai = new OpenAI({apiKey});
  const content: Array<
    | {type: "text"; text: string}
    | {type: "image_url"; image_url: {url: string; detail: "high"}}
  > = [{type: "text", text: ADMISSION_EXTRACTION_PROMPT}];

  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: {url: input.imageDataUrl, detail: "high"},
    });
  }
  if (input.supplementText && input.supplementText.trim().length > 0) {
    content.push({
      type: "text",
      text: "\n\nSOURCE TEXT:\n\n" + input.supplementText,
    });
  }

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{role: "user", content}],
      response_format: {type: "json_object"},
      max_tokens: 1500,
      temperature: 0.1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[extract-admission] OpenAI call failed", {error: msg});
    return {ok: false, rawText: "", error: msg};
  }

  const rawText = resp.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {ok: false, rawText, error: "JSON parse failed"};
  }

  const normalized = normalizeAdmission(parsed);
  if (!normalized) {
    return {
      ok: false,
      rawText,
      error: "Missing required fields (schoolName, department, year)",
    };
  }

  logger.info("[extract-admission] OK", {
    school: normalized.schoolName,
    year: normalized.year,
    confidence: normalized.aiConfidence,
  });
  return {ok: true, data: normalized, rawText};
}

// ---------- Performance extraction (M8) ----------

export type PerformanceCompanyType =
  | "national"
  | "private"
  | "university"
  | "foreign"
  | "other";

export type PerformanceExtractionResult = {
  title: string;
  company: string;
  companyType: PerformanceCompanyType;
  venue: string;
  dateStart: string | null;
  dateEnd: string | null;
  showtimes: string[];
  ticketPriceMin: number | null;
  ticketPriceMax: number | null;
  ticketUrl: string | null;
  description: string | null;
  choreographer: string | null;
  composer: string | null;
  runtime: number | null;
  ageLimit: string | null;
  posterUrl: string | null;
  officialUrl: string | null;
  aiConfidence: number;
  aiFieldNotes: Record<string, string>;
};

export type PerformanceExtractionOutcome =
  | { ok: true; data: PerformanceExtractionResult; rawText: string }
  | { ok: false; rawText: string; error: string };

const VALID_COMPANY_TYPES: PerformanceCompanyType[] = [
  "national",
  "private",
  "university",
  "foreign",
  "other",
];

function asPositiveInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return Math.round(v);
  }
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return null;
}

function normalizePerformance(
  raw: unknown,
): PerformanceExtractionResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = asString(r.title);
  const company = asString(r.company);
  if (!title || !company) return null;

  const rawType = r.companyType;
  const companyType: PerformanceCompanyType =
    typeof rawType === "string" &&
    VALID_COMPANY_TYPES.includes(rawType as PerformanceCompanyType) ?
      (rawType as PerformanceCompanyType) :
      "other";

  return {
    title,
    company,
    companyType,
    venue: asString(r.venue) ?? "",
    dateStart: asString(r.dateStart),
    dateEnd: asString(r.dateEnd),
    showtimes: asStringArray(r.showtimes),
    ticketPriceMin: asPositiveInt(r.ticketPriceMin),
    ticketPriceMax: asPositiveInt(r.ticketPriceMax),
    ticketUrl: asString(r.ticketUrl),
    description: asString(r.description),
    choreographer: asString(r.choreographer),
    composer: asString(r.composer),
    runtime: asPositiveInt(r.runtime),
    ageLimit: asString(r.ageLimit),
    posterUrl: asString(r.posterUrl),
    officialUrl: asString(r.officialUrl),
    aiConfidence: asConfidence(r.aiConfidence),
    aiFieldNotes: asNoteMap(r.aiFieldNotes),
  };
}

export async function extractPerformance(
  input: ExtractionInput,
  apiKey: string,
): Promise<PerformanceExtractionOutcome> {
  if (!input.imageDataUrl && !(input.supplementText?.trim())) {
    return {
      ok: false,
      rawText: "",
      error: "No input — pass imageDataUrl, supplementText, or both",
    };
  }

  const openai = new OpenAI({apiKey});
  const content: Array<
    | {type: "text"; text: string}
    | {type: "image_url"; image_url: {url: string; detail: "high"}}
  > = [{type: "text", text: PERFORMANCE_EXTRACTION_PROMPT}];

  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: {url: input.imageDataUrl, detail: "high"},
    });
  }
  if (input.supplementText && input.supplementText.trim().length > 0) {
    content.push({
      type: "text",
      text: "\n\nSOURCE TEXT:\n\n" + input.supplementText,
    });
  }

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{role: "user", content}],
      response_format: {type: "json_object"},
      max_tokens: 1500,
      temperature: 0.1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[extract-performance] OpenAI call failed", {error: msg});
    return {ok: false, rawText: "", error: msg};
  }

  const rawText = resp.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {ok: false, rawText, error: "JSON parse failed"};
  }

  const normalized = normalizePerformance(parsed);
  if (!normalized) {
    return {
      ok: false,
      rawText,
      error: "Missing required fields (title, company)",
    };
  }

  logger.info("[extract-performance] OK", {
    title: normalized.title,
    company: normalized.company,
    confidence: normalized.aiConfidence,
  });
  return {ok: true, data: normalized, rawText};
}
