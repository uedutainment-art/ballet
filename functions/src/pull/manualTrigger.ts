// M11: HTTPS callable triggers for the pull crawler.
//
//   pullCrawlerManual      — run every crawl-enabled org (admin only)
//   triggerCrawlForOrg     — run a single org (editor+ — "지금 크롤" button)
//   resetOrgSeenHashes     — clear an org's dedup ring (editor+)
//
// Returns a structured result the UI shows in a toast.

import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {runAllCrawls} from "./runner";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

async function requireEditor(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요해요");
  const snap = await getFirestore().collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "권한이 없어요");
  const role = snap.data()?.role;
  if (role !== "EDITOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new HttpsError(
      "permission-denied",
      "EDITOR 이상의 권한이 필요해요",
    );
  }
  return {
    role,
    displayName: (snap.data()?.displayName as string | undefined) ?? "Editor",
  };
}

async function requireAdmin(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요해요");
  const snap = await getFirestore().collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "권한이 없어요");
  const role = snap.data()?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new HttpsError(
      "permission-denied",
      "ADMIN 이상의 권한이 필요해요",
    );
  }
  return {
    role,
    displayName: (snap.data()?.displayName as string | undefined) ?? "Admin",
  };
}

// "지금 전체 크롤" — runs every crawlEnabled org. Heavyweight; admin only.
export const pullCrawlerManual = onCall(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_KEY],
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (req) => {
    const actor = await requireAdmin(req.auth?.uid);
    logger.info("[pull-manual-all] starting", {uid: req.auth?.uid});
    const result = await runAllCrawls({
      triggerType: "MANUAL_ALL",
      triggeredBy: req.auth?.uid,
      triggeredByName: actor.displayName,
      apiKey: OPENAI_KEY.value(),
    });
    return result;
  },
);

// "지금 크롤" on a single org. Editor and above (per spec).
export const triggerCrawlForOrg = onCall(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_KEY],
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (req) => {
    const actor = await requireEditor(req.auth?.uid);
    const orgId = (req.data?.orgId as string | undefined)?.trim();
    if (!orgId) {
      throw new HttpsError("invalid-argument", "orgId가 필요해요");
    }
    const orgSnap = await getFirestore()
      .collection("organizations")
      .doc(orgId)
      .get();
    if (!orgSnap.exists) {
      throw new HttpsError("not-found", "기관을 찾을 수 없어요");
    }
    logger.info("[pull-manual-org] starting", {
      uid: req.auth?.uid,
      orgId,
    });
    const result = await runAllCrawls({
      triggerType: "MANUAL_ORG",
      triggeredBy: req.auth?.uid,
      triggeredByName: actor.displayName,
      apiKey: OPENAI_KEY.value(),
      onlyOrgIds: [orgId],
    });
    return result;
  },
);

// Reset an org's seenUrlHashes — useful when the operator wants to force a
// re-extract of every article on the board.
export const resetOrgSeenHashes = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 30},
  async (req) => {
    await requireEditor(req.auth?.uid);
    const orgId = (req.data?.orgId as string | undefined)?.trim();
    if (!orgId) {
      throw new HttpsError("invalid-argument", "orgId가 필요해요");
    }
    await getFirestore()
      .collection("organizations")
      .doc(orgId)
      .update({
        "crawlStatus.seenUrlHashes": [],
        "lastUpdatedAt": FieldValue.serverTimestamp(),
      });
    logger.info("[reset-seen] done", {orgId, uid: req.auth?.uid});
    return {ok: true};
  },
);
