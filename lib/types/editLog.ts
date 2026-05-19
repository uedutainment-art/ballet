import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";

export type EditLogDocType =
  | "competition"
  | "admission"
  | "performance"
  | "video";

export interface EditLog {
  id: string;
  docRef: string; // e.g. "competitions/kibc-2026"
  docType: EditLogDocType;
  docTitle: string; // copied from doc for cheap dashboard rendering
  fromStatus?: ContentStatus;
  toStatus?: ContentStatus;
  userId: string;
  userDisplayName: string;
  timestamp: Timestamp;
  changedFields: string[];
  note?: string;
}
