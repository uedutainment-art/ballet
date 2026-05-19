import {createHash} from "node:crypto";
import {getFirestore} from "firebase-admin/firestore";

// Hash that identifies a competition for dedup purposes.
//
// Uses name + dateStart so re-runs of the same source on the same week
// don't create duplicate DRAFTs. dateStart is part of the hash so that two
// editions of the same competition in different years still count as
// separate entries.

export function competitionHash(name: string, dateStart: string | null): string {
  const norm = name.trim().replace(/\s+/g, " ").toLowerCase();
  const datePart = dateStart ?? "no-date";
  return createHash("sha256")
    .update(`${norm}|${datePart}`)
    .digest("hex")
    .slice(0, 24);
}

export async function hashAlreadyExists(hash: string): Promise<boolean> {
  const db = getFirestore();
  const snap = await db
    .collection("competitions")
    .where("pullHash", "==", hash)
    .limit(1)
    .get();
  return !snap.empty;
}
