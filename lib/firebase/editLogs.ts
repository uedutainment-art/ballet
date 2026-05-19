import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { EditLog, EditLogDocType } from "@/lib/types/editLog";
import type { ContentStatus } from "@/lib/types/status";

type RecordEditArgs = {
  docRef: string;
  docType: EditLogDocType;
  docTitle: string;
  userId: string;
  userDisplayName: string;
  fromStatus?: ContentStatus;
  toStatus?: ContentStatus;
  changedFields: string[];
  note?: string;
};

export async function recordEdit(args: RecordEditArgs): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      docRef: args.docRef,
      docType: args.docType,
      docTitle: args.docTitle,
      userId: args.userId,
      userDisplayName: args.userDisplayName,
      timestamp: serverTimestamp(),
      changedFields: args.changedFields,
    };
    if (args.fromStatus) payload.fromStatus = args.fromStatus;
    if (args.toStatus) payload.toStatus = args.toStatus;
    if (args.note) payload.note = args.note;
    await addDoc(collection(db, "editLogs"), payload);
  } catch (err) {
    // Logging should never block the editor. Surface but keep moving.
    console.error("[editLogs] recordEdit failed:", err);
  }
}

export async function fetchRecentEditLogs(n: number): Promise<EditLog[]> {
  try {
    const q = query(
      collection(db, "editLogs"),
      orderBy("timestamp", "desc"),
      fbLimit(n),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<EditLog, "id" | "timestamp"> & {
        timestamp?: Timestamp;
      };
      return {
        ...data,
        id: d.id,
        timestamp: data.timestamp ?? Timestamp.now(),
      } as EditLog;
    });
  } catch (err) {
    console.error("[editLogs] fetchRecentEditLogs failed:", err);
    return [];
  }
}
