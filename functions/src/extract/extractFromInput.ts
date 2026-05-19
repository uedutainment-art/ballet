import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  extractAdmission,
  extractCompetition,
  type AdmissionExtractionResult,
  type ExtractionResult,
} from "../ai/extract";
import {fetchPageText} from "../ai/fetchPageText";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

type InputMode = "image" | "pdf" | "url" | "text";
type ApplyMode = "overwrite" | "fill_empty" | "higher_confidence";
type Domain = "competition" | "admission";

type CallRequest = {
  docId: string;
  domain: Domain;
  mode: InputMode;
  applyMode: ApplyMode;
  payload: {
    dataUrl?: string;
    url?: string;
    text?: string;
  };
};

type CallResponse = {
  success: boolean;
  fieldsUpdated: string[];
  confidence: number;
  fieldNotes: Record<string, string>;
};

// Re-extractable fields per domain. Everything else (id, status, source
// provenance, submitter info, timestamps) is preserved.
const EXTRACTABLE_FIELDS_BY_DOMAIN: Record<Domain, readonly string[]> = {
  competition: [
    "name",
    "host",
    "edition",
    "category",
    "dateStart",
    "dateEnd",
    "registrationStart",
    "registrationEnd",
    "venue",
    "sections",
    "ageGroups",
    "fee",
    "awards",
    "officialUrl",
    "registerUrl",
  ],
  admission: [
    "schoolName",
    "department",
    "schoolType",
    "year",
    "capacity",
    "regStart",
    "regEnd",
    "practical1",
    "practical2",
    "announcementAt",
    "subjects",
    "csat",
    "fee",
    "guidelineUrl",
    "officialUrl",
  ],
};

const DATE_FIELDS_BY_DOMAIN: Record<Domain, Set<string>> = {
  competition: new Set([
    "dateStart",
    "dateEnd",
    "registrationStart",
    "registrationEnd",
  ]),
  admission: new Set([
    "regStart",
    "regEnd",
    "practical1",
    "practical2",
    "announcementAt",
  ]),
};

const COLLECTION_BY_DOMAIN: Record<Domain, string> = {
  competition: "competitions",
  admission: "admissions",
};

function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function parseDate(s: string | null): Timestamp | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return Timestamp.fromDate(
    new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Timestamp && b instanceof Timestamp) {
    return a.toMillis() === b.toMillis();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
}

function mergeWithMode(
  existing: Record<string, unknown>,
  extracted: ExtractionResult | AdmissionExtractionResult,
  applyMode: ApplyMode,
  domain: Domain,
): {patch: Record<string, unknown>; changedFields: string[]} {
  const fields = EXTRACTABLE_FIELDS_BY_DOMAIN[domain];
  const dateFields = DATE_FIELDS_BY_DOMAIN[domain];

  // Higher-confidence: overwrite vs fill_empty based on new vs existing.
  const existingConfidence =
    typeof existing.aiConfidence === "number" ? existing.aiConfidence : 0;
  const effective: "overwrite" | "fill_empty" =
    applyMode === "overwrite" ?
      "overwrite" :
      applyMode === "fill_empty" ?
        "fill_empty" :
        extracted.aiConfidence > existingConfidence ?
          "overwrite" :
          "fill_empty";

  const patch: Record<string, unknown> = {};
  const changedFields: string[] = [];
  const extractedRec = extracted as unknown as Record<string, unknown>;

  for (const field of fields) {
    const rawNew = extractedRec[field];
    let newValue: unknown = rawNew;
    if (dateFields.has(field)) {
      newValue = parseDate(rawNew as string | null);
    }
    if (isEmptyValue(newValue)) continue;

    const oldValue = existing[field];
    if (effective === "fill_empty" && !isEmptyValue(oldValue)) continue;
    if (valuesEqual(oldValue, newValue)) continue;

    patch[field] = newValue;
    changedFields.push(field);
  }

  if (changedFields.length > 0) {
    patch.aiConfidence = extracted.aiConfidence;
    const existingNotes = (existing.aiFieldNotes as Record<string, string>) ??
      {};
    patch.aiFieldNotes = {...existingNotes, ...extracted.aiFieldNotes};
  }

  return {patch, changedFields};
}

// Build the "existing record being updated: …" context the LLM sees before
// fresh source content. Different fields per domain.
function buildContextLine(
  existing: Record<string, unknown>,
  domain: Domain,
): string {
  if (domain === "admission") {
    return (
      `Existing admission record being updated: "${existing.schoolName ?? ""}" — ` +
      `department "${existing.department ?? ""}", year ${existing.year ?? "?"}. ` +
      "The new source below describes the SAME admission cycle; extract the " +
      "same fields, preferring concrete facts over assumptions.\n\n"
    );
  }
  return (
    `Existing record being updated: "${existing.name ?? ""}" — host "${existing.host ?? ""}". ` +
    "The new source below describes the SAME event; extract the same fields, " +
    "preferring concrete facts over assumptions.\n\n"
  );
}

function docTitleFor(
  domain: Domain,
  data: Record<string, unknown>,
  fallback: string,
): string {
  if (domain === "admission") {
    const school = data.schoolName ?? "";
    const dept = data.department ?? "";
    return school || dept ? `${school} ${dept}`.trim() : fallback;
  }
  return (data.name as string) || fallback;
}

export const extractFromInput = onCall<CallRequest, Promise<CallResponse>>(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_KEY],
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (req) => {
    // ---- Auth ----
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요해요");
    }
    const db = getFirestore();
    const userSnap = await db.collection("users").doc(req.auth.uid).get();
    const role = userSnap.data()?.role;
    if (role !== "EDITOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      throw new HttpsError("permission-denied", "EDITOR 이상의 권한이 필요해요");
    }

    // ---- Validate request ----
    const {docId, domain, mode, applyMode, payload} = req.data ?? {};
    if (!docId || !domain || !mode || !applyMode) {
      throw new HttpsError(
        "invalid-argument",
        "docId, domain, mode, applyMode are required",
      );
    }
    if (domain !== "competition" && domain !== "admission") {
      throw new HttpsError("invalid-argument", `Unknown domain: ${domain}`);
    }
    if (!["image", "pdf", "url", "text"].includes(mode)) {
      throw new HttpsError("invalid-argument", `Unknown mode: ${mode}`);
    }
    if (!["overwrite", "fill_empty", "higher_confidence"].includes(applyMode)) {
      throw new HttpsError(
        "invalid-argument",
        `Unknown applyMode: ${applyMode}`,
      );
    }

    const collection = COLLECTION_BY_DOMAIN[domain];

    // ---- Load existing doc ----
    const docRef = db.collection(collection).doc(docId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new HttpsError(
        "not-found",
        domain === "admission" ? "입시 정보를 찾을 수 없어요" : "대회를 찾을 수 없어요",
      );
    }
    const existing = docSnap.data() ?? {};
    const contextLine = buildContextLine(existing, domain);

    // ---- Run extraction (domain decides which model + schema) ----
    const runExtractor = (input: {imageDataUrl?: string; supplementText?: string}) =>
      domain === "admission" ?
        extractAdmission(input, OPENAI_KEY.value()) :
        extractCompetition(input, OPENAI_KEY.value());

    let extractionResult;
    switch (mode) {
    case "image":
    case "pdf": {
      if (!payload?.dataUrl || !payload.dataUrl.startsWith("data:")) {
        throw new HttpsError(
          "invalid-argument",
          `${mode} mode requires payload.dataUrl (data:... URL)`,
        );
      }
      extractionResult = await runExtractor({
        imageDataUrl: payload.dataUrl,
        supplementText: contextLine,
      });
      break;
    }
    case "url": {
      if (!payload?.url) {
        throw new HttpsError(
          "invalid-argument",
          "url mode requires payload.url",
        );
      }
      const pageText = await fetchPageText(payload.url);
      if (!pageText) {
        throw new HttpsError(
          "failed-precondition",
          "URL에서 본문을 읽지 못했어요 (404 / 비-HTML / 차단)",
        );
      }
      extractionResult = await runExtractor({
        supplementText: contextLine + pageText,
      });
      break;
    }
    case "text": {
      const text = payload?.text?.trim() ?? "";
      if (text.length === 0) {
        throw new HttpsError(
          "invalid-argument",
          "text mode requires non-empty payload.text",
        );
      }
      extractionResult = await runExtractor({
        supplementText: contextLine + text,
      });
      break;
    }
    }

    if (!extractionResult.ok) {
      throw new HttpsError(
        "internal",
        `AI 추출 실패: ${extractionResult.error}`,
      );
    }

    // ---- Merge and write ----
    const {patch, changedFields} = mergeWithMode(
      existing,
      extractionResult.data,
      applyMode,
      domain,
    );

    if (changedFields.length > 0) {
      patch.lastUpdatedAt = FieldValue.serverTimestamp();
      await docRef.update(patch);

      const dataRec = extractionResult.data as unknown as Record<string, unknown>;
      const fallbackTitle =
        domain === "admission" ?
          `${existing.schoolName ?? ""} ${existing.department ?? ""}`.trim() ||
            docId :
          (existing.name as string) || docId;

      await db.collection("editLogs").add({
        docRef: `${collection}/${docId}`,
        docType: domain,
        docTitle: docTitleFor(domain, dataRec, fallbackTitle),
        userId: req.auth.uid,
        userDisplayName:
          (userSnap.data()?.displayName as string | undefined) ?? "Editor",
        timestamp: FieldValue.serverTimestamp(),
        changedFields,
        note: `재추출 (${domain}, ${mode}, ${applyMode})`,
      });
    }

    logger.info("[extract-input] done", {
      docId,
      domain,
      mode,
      applyMode,
      fieldsUpdated: changedFields.length,
      confidence: extractionResult.data.aiConfidence,
    });

    return {
      success: true,
      fieldsUpdated: changedFields,
      confidence: extractionResult.data.aiConfidence,
      fieldNotes: extractionResult.data.aiFieldNotes,
    };
  },
);
