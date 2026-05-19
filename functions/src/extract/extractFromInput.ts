import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  extractCompetition,
  type ExtractionResult,
} from "../ai/extract";
import {fetchPageText} from "../ai/fetchPageText";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

type InputMode = "image" | "pdf" | "url" | "text";
type ApplyMode = "overwrite" | "fill_empty" | "higher_confidence";

type CallRequest = {
  competitionId: string;
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

// Fields the re-extraction is allowed to touch. Everything else (id, status,
// source provenance, posterUrl, submitter info, timestamps) is preserved.
const EXTRACTABLE_FIELDS = [
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
] as const;

const DATE_FIELDS = new Set([
  "dateStart",
  "dateEnd",
  "registrationStart",
  "registrationEnd",
]);

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
  extracted: ExtractionResult,
  applyMode: ApplyMode,
): {patch: Record<string, unknown>; changedFields: string[]} {
  // Higher-confidence is a meta-mode: it picks overwrite vs fill_empty based
  // on whether the new extraction is more confident than what's on file.
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

  for (const field of EXTRACTABLE_FIELDS) {
    const rawNew = (extracted as unknown as Record<string, unknown>)[field];
    let newValue: unknown = rawNew;
    if (DATE_FIELDS.has(field)) {
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
    // Merge notes: keep old notes for fields we didn't touch, overlay new.
    const existingNotes = (existing.aiFieldNotes as Record<string, string>) ??
      {};
    patch.aiFieldNotes = {...existingNotes, ...extracted.aiFieldNotes};
  }

  return {patch, changedFields};
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
    const {competitionId, mode, applyMode, payload} = req.data ?? {};
    if (!competitionId || !mode || !applyMode) {
      throw new HttpsError(
        "invalid-argument",
        "competitionId, mode, applyMode are required",
      );
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

    // ---- Load existing competition for context + merge baseline ----
    const compRef = db.collection("competitions").doc(competitionId);
    const compSnap = await compRef.get();
    if (!compSnap.exists) {
      throw new HttpsError("not-found", "대회를 찾을 수 없어요");
    }
    const existing = compSnap.data() ?? {};

    const contextLine =
      `Existing record being updated: "${existing.name ?? ""}" — host "${existing.host ?? ""}". ` +
      "The new source below describes the SAME event; extract the same fields, " +
      "preferring concrete facts over assumptions.\n\n";

    // ---- Run extraction for the requested mode ----
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
      extractionResult = await extractCompetition(
        {
          imageDataUrl: payload.dataUrl,
          supplementText: contextLine,
        },
        OPENAI_KEY.value(),
      );
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
      extractionResult = await extractCompetition(
        {supplementText: contextLine + pageText},
        OPENAI_KEY.value(),
      );
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
      extractionResult = await extractCompetition(
        {supplementText: contextLine + text},
        OPENAI_KEY.value(),
      );
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
    );

    if (changedFields.length > 0) {
      patch.lastUpdatedAt = FieldValue.serverTimestamp();
      await compRef.update(patch);

      await db.collection("editLogs").add({
        docRef: `competitions/${competitionId}`,
        docType: "competition",
        docTitle:
          (patch.name as string | undefined) ??
          (existing.name as string | undefined) ??
          competitionId,
        userId: req.auth.uid,
        userDisplayName:
          (userSnap.data()?.displayName as string | undefined) ?? "Editor",
        timestamp: FieldValue.serverTimestamp(),
        changedFields,
        note: `재추출 (${mode}, ${applyMode})`,
      });
    }

    logger.info("[extract-input] done", {
      competitionId,
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
