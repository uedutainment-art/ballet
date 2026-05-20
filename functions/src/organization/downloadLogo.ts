import {randomUUID} from "node:crypto";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

if (getApps().length === 0) {
  initializeApp();
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const FETCH_TIMEOUT_MS = 5_000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

type CallRequest = {
  orgId: string;
  sourceUrl: string;
};

type CallResponse = {
  logoUrl: string;
  sourceUrl: string;
};

// Download a logo candidate from a third-party site, store it under
// organizations/{orgId}/logo.{ext}, and update the org doc's logoUrl +
// logoSourceUrl in one shot. The editor receives the new logoUrl in the
// response so they can re-render immediately without a second read.
//
// Security:
//   - editor role required (gated via Firestore users/{uid}.role)
//   - http(s) protocols only
//   - content-type must start with image/
//   - 2MB cap, 5s download timeout
//   - User-Agent identifies the bot (no spoofing)
//   - source URL recorded in object metadata for audit

export const downloadOrgLogo = onCall<CallRequest, Promise<CallResponse>>(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    maxInstances: 5,
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
    const {orgId, sourceUrl} = req.data ?? {};
    if (!orgId || !sourceUrl) {
      throw new HttpsError(
        "invalid-argument",
        "orgId, sourceUrl are required",
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new HttpsError("invalid-argument", "URL 형식이 올바르지 않아요");
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new HttpsError("invalid-argument", "http(s)만 허용");
    }

    // Confirm the org exists before pulling anything down.
    const orgRef = db.collection("organizations").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      throw new HttpsError("not-found", "기관을 찾을 수 없어요");
    }

    // ---- Download with timeout ----
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; KBalletBot/1.0; " +
            "+https://ballet-kappa.vercel.app)",
          "Accept": "image/*",
        },
        redirect: "follow",
      });
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn("[downloadOrgLogo] fetch failed", {sourceUrl, msg});
      throw new HttpsError("unavailable", `다운로드 실패: ${msg}`);
    }
    clearTimeout(timer);

    if (!resp.ok) {
      throw new HttpsError(
        "not-found",
        `이미지 다운로드 실패 (${resp.status})`,
      );
    }

    const contentType = (resp.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new HttpsError(
        "invalid-argument",
        `이미지가 아니에요 (${contentType || "unknown"})`,
      );
    }

    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        `2MB를 넘어요 (${Math.round(arrayBuffer.byteLength / 1024)}KB)`,
      );
    }
    const buffer = Buffer.from(arrayBuffer);

    // ---- Pick extension from content-type, fall back to URL path ----
    const ctSub = contentType.split("/")[1]?.split(";")[0] ?? "";
    let ext = ctSub === "jpeg" ? "jpg" : ctSub;
    if (!ext || !/^[a-z0-9]+$/.test(ext)) {
      const pathExt = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
      ext = /^(png|jpg|jpeg|svg|gif|webp)$/.test(pathExt) ?
        pathExt === "jpeg" ? "jpg" : pathExt :
        "png";
    }

    // ---- Upload to Storage ----
    // Explicit bucket — auto-discovery picks the wrong default for projects
    // on the firebasestorage.app domain.
    const bucket = getStorage().bucket("ballet-d0d4c.firebasestorage.app");
    const objectPath = `organizations/${orgId}/logo.${ext}`;
    const token = randomUUID();
    await bucket.file(objectPath).save(buffer, {
      contentType,
      metadata: {
        contentType,
        metadata: {
          sourceUrl: parsed.toString(),
          downloadedAt: new Date().toISOString(),
          orgId,
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const logoUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
      `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

    // ---- Update the org doc ----
    await orgRef.update({
      logoUrl,
      logoSourceUrl: parsed.toString(),
      lastUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("[downloadOrgLogo] OK", {
      orgId,
      sourceUrl: parsed.toString(),
      bytes: buffer.length,
      ext,
    });

    return {logoUrl, sourceUrl: parsed.toString()};
  },
);
