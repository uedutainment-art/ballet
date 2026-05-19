import {onObjectFinalized} from "firebase-functions/v2/storage";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {extractCompetitionFromImage} from "../ai/extract";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

// Build a Firestore Timestamp from a YYYY-MM-DD string at local midnight.
function parseDateMaybe(yyyymmdd: string | null): Timestamp | null {
  if (!yyyymmdd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Timestamp.fromDate(d);
}

// Cloud Function: fires on any Storage object finalize. We only process
// objects under submissions/* — everything else is ignored quietly.

export const extractFromPoster = onObjectFinalized(
  {
    region: "asia-northeast3",
    // Explicit bucket — auto-discovery picks the wrong default for projects
    // on the new firebasestorage.app domain.
    bucket: "ballet-d0d4c.firebasestorage.app",
    secrets: [OPENAI_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath || !filePath.startsWith("submissions/")) {
      logger.debug("[extract] skip non-submission path:", filePath);
      return;
    }

    const bucketName = event.data.bucket;
    const contentType = event.data.contentType ?? "";
    const customMetadata = (event.data.metadata ?? {}) as Record<
      string,
      string
    >;

    logger.info("[extract] new submission", {
      filePath,
      contentType,
      submittedByEmail: customMetadata.submittedByEmail,
    });

    // Signed URL the OpenAI API can fetch on its end.
    const file = getStorage().bucket(bucketName).file(filePath);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    const result = await extractCompetitionFromImage(
      signedUrl,
      OPENAI_KEY.value(),
    );

    const db = getFirestore();
    const now = FieldValue.serverTimestamp();

    if (!result.ok) {
      logger.error("[extract] failed", {filePath, error: result.error});
      await db.collection("_failures").add({
        type: "competition_extraction",
        filePath,
        bucket: bucketName,
        contentType,
        customMetadata,
        rawText: result.rawText,
        error: result.error,
        createdAt: now,
      });
      return;
    }

    const data = result.data;
    const posterUrl = `https://storage.googleapis.com/${bucketName}/${encodeURI(
      filePath,
    )}`;

    const doc: Record<string, unknown> = {
      status: "DRAFT",
      category: data.category,
      source: "push",
      name: data.name,
      host: data.host,
      venue: data.venue ?? "",
      sections: data.sections,
      ageGroups: data.ageGroups,
      officialUrl: data.officialUrl ?? "",
      posterUrl,
      aiCollectedAt: now,
      aiConfidence: data.aiConfidence,
      aiFieldNotes: data.aiFieldNotes,
    };
    if (data.edition) doc.edition = data.edition;
    const dateStart = parseDateMaybe(data.dateStart);
    const dateEnd = parseDateMaybe(data.dateEnd);
    const regStart = parseDateMaybe(data.registrationStart);
    const regEnd = parseDateMaybe(data.registrationEnd);
    if (dateStart) doc.dateStart = dateStart;
    if (dateEnd) doc.dateEnd = dateEnd;
    if (regStart) doc.registrationStart = regStart;
    if (regEnd) doc.registrationEnd = regEnd;
    if (data.fee) doc.fee = data.fee;
    if (data.awards) doc.awards = data.awards;
    if (data.registerUrl) doc.registerUrl = data.registerUrl;
    if (customMetadata.submittedByEmail) {
      doc.submittedByEmail = customMetadata.submittedByEmail;
    }
    if (customMetadata.link) doc.sourceUrl = customMetadata.link;
    if (customMetadata.title) doc.submittedTitle = customMetadata.title;

    const ref = await db.collection("competitions").add(doc);
    logger.info("[extract] DRAFT created", {
      id: ref.id,
      name: data.name,
      confidence: data.aiConfidence,
    });
  },
);
