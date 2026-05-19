import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { recordEdit } from "@/lib/firebase/editLogs";
import type { ContentStatus } from "@/lib/types/status";
import type { EditLogDocType } from "@/lib/types/editLog";

type Actor = { uid: string; displayName: string };

type Ctx = {
  id: string;
  docTitle: string;
  fromStatus: ContentStatus;
  collection: string; // e.g. "competitions" | "admissions"
  docType: EditLogDocType;
};

async function transition(
  ctx: Ctx,
  actor: Actor,
  patch: Record<string, unknown>,
  toStatus: ContentStatus,
  extraChangedFields: string[] = [],
) {
  await updateDoc(doc(db, ctx.collection, ctx.id), {
    ...patch,
    status: toStatus,
    lastUpdatedAt: serverTimestamp(),
  });
  await recordEdit({
    docRef: `${ctx.collection}/${ctx.id}`,
    docType: ctx.docType,
    docTitle: ctx.docTitle,
    userId: actor.uid,
    userDisplayName: actor.displayName,
    fromStatus: ctx.fromStatus,
    toStatus,
    changedFields: ["status", ...extraChangedFields],
  });
}

export function transitionToInReview(ctx: Ctx, actor: Actor) {
  return transition(ctx, actor, { editorId: actor.uid }, "IN_REVIEW", [
    "editorId",
  ]);
}

export function transitionToReady(ctx: Ctx, actor: Actor) {
  return transition(
    ctx,
    actor,
    { editorId: actor.uid, reviewedAt: serverTimestamp() },
    "READY",
    ["editorId", "reviewedAt"],
  );
}

export function transitionToPublished(ctx: Ctx, actor: Actor) {
  return transition(
    ctx,
    actor,
    {
      approvedBy: actor.uid,
      adminId: actor.uid,
      publishedAt: serverTimestamp(),
    },
    "PUBLISHED",
    ["approvedBy", "publishedAt"],
  );
}

export function transitionToArchived(ctx: Ctx, actor: Actor) {
  return transition(ctx, actor, {}, "ARCHIVED");
}

// "Hold" parks the doc back in IN_REVIEW from any non-archived state.
export function transitionToHold(ctx: Ctx, actor: Actor) {
  return transition(ctx, actor, { editorId: actor.uid }, "IN_REVIEW", [
    "editorId",
  ]);
}
