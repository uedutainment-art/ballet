import type { Timestamp } from "firebase/firestore";

// Pure formatting helpers. Kept framework-agnostic so they can run in both
// Server Components and Client Components without import cost.

const tsLike = (
  v: Timestamp | { seconds: number; nanoseconds: number } | null | undefined,
): Date | null => {
  if (!v) return null;
  if (typeof (v as Timestamp).toDate === "function") {
    return (v as Timestamp).toDate();
  }
  if (typeof v.seconds === "number") {
    return new Date(v.seconds * 1000);
  }
  return null;
};

export function formatDate(
  v:
    | Timestamp
    | { seconds: number; nanoseconds: number }
    | Date
    | null
    | undefined,
): string {
  if (!v) return "";
  const d = v instanceof Date ? v : tsLike(v);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export function formatDateRange(
  start:
    | Timestamp
    | { seconds: number; nanoseconds: number }
    | Date
    | null
    | undefined,
  end:
    | Timestamp
    | { seconds: number; nanoseconds: number }
    | Date
    | null
    | undefined,
): string {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return "";
  if (s && e && s !== e) return `${s} – ${e}`;
  return s || e;
}

export function toDate(
  v:
    | Timestamp
    | { seconds: number; nanoseconds: number }
    | Date
    | null
    | undefined,
): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  return tsLike(v);
}
