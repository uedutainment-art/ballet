// Tiny relative-time helper used across the admin (last-run badges etc.).
// Korean copy because the rest of the admin is Korean. Falls back to
// "방금 전" / a date string for far past.

import type { Timestamp } from "firebase/firestore";

export function relativeTimeKo(
  ts: Timestamp | Date | null | undefined,
): string {
  if (!ts) return "없음";
  const date = ts instanceof Date ? ts : ts.toDate();
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "예정";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}개월 전`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
