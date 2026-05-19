import {randomUUID} from "node:crypto";
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

// Best-effort fetch of the submitter-provided reference URL. Returns up to
// ~12k chars of cleaned page text, or null if the URL is missing / fetch
// fails / response is too large. Never throws — degrades to image-only.
const SUPPLEMENT_MAX_CHARS = 12000;
const FETCH_TIMEOUT_MS = 8000;

async function fetchPageText(rawUrl?: string): Promise<string | null> {
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
      logger.info("[fetchPageText] non-OK response", {
        url: rawUrl,
        status: resp.status,
      });
      return null;
    }
    const contentType = resp.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      logger.info("[fetchPageText] non-HTML content-type, skipping", {
        url: rawUrl,
        contentType,
      });
      return null;
    }
    const html = await resp.text();
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
    return cleaned.slice(0, SUPPLEMENT_MAX_CHARS);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.info("[fetchPageText] fetch failed", {url: rawUrl, error: msg});
    return null;
  }
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

    // Download the image bytes and inline them as a base64 data URL. This
    // avoids needing iam.serviceAccounts.signBlob permission (signed URLs),
    // and is one network hop fewer than letting OpenAI pull from Storage.
    const file = getStorage().bucket(bucketName).file(filePath);
    const [buffer] = await file.download();
    const base64 = buffer.toString("base64");
    const imageMime = contentType || "image/jpeg";
    const dataUrl = `data:${imageMime};base64,${base64}`;

    logger.info("[extract] image fetched", {
      bytes: buffer.length,
      mime: imageMime,
    });

    const linkText = await fetchPageText(customMetadata.link);
    if (linkText) {
      logger.info("[extract] supplemental link text fetched", {
        link: customMetadata.link,
        chars: linkText.length,
      });
    }

    const result = await extractCompetitionFromImage(
      dataUrl,
      OPENAI_KEY.value(),
      linkText,
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

    // Mint a Firebase download token so the poster URL bypasses Storage rules
    // (which deny public read on submissions/*). The token is an unguessable
    // UUID and lives on the object's metadata — only consumers with the URL
    // can read.
    const token = randomUUID();
    await file.setMetadata({
      metadata: {
        ...customMetadata,
        firebaseStorageDownloadTokens: token,
      },
    });
    const posterUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucketName}` +
      `/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;

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
