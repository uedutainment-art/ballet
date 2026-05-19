import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {runCrawl} from "./runCrawl";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

// Runs every Monday 08:00 KST. The scheduler creates a Cloud Scheduler job
// on first deploy.

export const pullCrawlerScheduled = onSchedule(
  {
    schedule: "every monday 08:00",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: [OPENAI_KEY],
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async () => {
    const apiKey = OPENAI_KEY.value();
    const result = await runCrawl(apiKey);
    logger.info("[pull-scheduled] done", {
      newDrafts: result.newDrafts,
      totalExtracted: result.totalExtracted,
    });
  },
);
