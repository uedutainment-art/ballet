import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {runCrawl} from "./runCrawl";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

// HTTPS callable invoked from the admin dashboard's "지금 실행" button.
// Only SUPER_ADMIN can trigger — auth + role are checked from the caller's
// ID token + their /users/{uid} doc.

export const pullCrawlerManual = onCall(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_KEY],
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (req) => {
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요해요");
    }
    const userSnap = await getFirestore()
      .collection("users")
      .doc(req.auth.uid)
      .get();
    if (!userSnap.exists) {
      throw new HttpsError("permission-denied", "운영자 권한이 없어요");
    }
    const role = userSnap.data()?.role;
    if (role !== "SUPER_ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Pull 크롤러 실행은 SUPER_ADMIN만 가능해요",
      );
    }

    logger.info("[pull-manual] starting", {uid: req.auth.uid});
    const apiKey = OPENAI_KEY.value();
    const result = await runCrawl(apiKey);
    return result;
  },
);
