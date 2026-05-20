// M11: Weekly pull crawler scheduler.
//
// Runs every Monday at 08:00 KST. Iterates /organizations where
// crawlEnabled == true && status == ACTIVE and dispatches per domain board URL.
// All bookkeeping lives in /crawlRuns/{runId}.

import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {runAllCrawls} from "./runner";

if (getApps().length === 0) {
  initializeApp();
}

const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

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
    const result = await runAllCrawls({
      triggerType: "SCHEDULED",
      apiKey,
    });
    logger.info("[pull-scheduled] done", result);
  },
);
