// On-demand ISR invalidation (M12-A).
//
// Called by the admin editor after a PUBLISHED transition so the home/list/
// detail pages don't have to wait out the 5-minute revalidate window.
//
// Security model: caller sends the editor's Firebase ID token in the
// `Authorization: Bearer <token>` header. We verify the token, look up the
// user's role in `/users/{uid}`, and only revalidate if they're editor+.
// No shared secret required — leveraging the existing auth boundary.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// Editor sends an array of paths to invalidate (typically 3: home + list + detail).
type RevalidateBody = {
  paths?: string[];
};

const ROLE_ALLOWED = new Set(["EDITOR", "ADMIN", "SUPER_ADMIN"]);

// Tight allow-list so a compromised editor token can't be used to thrash
// arbitrary routes. Only public-facing routes count.
const ALLOWED_PATH_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/(competitions|admissions|performances|videos|organizations)$/,
  /^\/(competitions|admissions|performances|videos|organizations)\/[a-zA-Z0-9_-]+$/,
];

function pathIsAllowed(p: string): boolean {
  return ALLOWED_PATH_PATTERNS.some((re) => re.test(p));
}

export async function POST(request: Request) {
  // ---- Auth ----
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/i.exec(auth);
  if (!m) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }
  const idToken = m[1];

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  // ---- Role check ----
  let role: string | undefined;
  try {
    const snap = await adminDb().collection("users").doc(uid).get();
    role = snap.data()?.role as string | undefined;
  } catch {
    return NextResponse.json({ error: "user lookup failed" }, { status: 500 });
  }
  if (!role || !ROLE_ALLOWED.has(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ---- Body ----
  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (paths.length === 0) {
    return NextResponse.json({ error: "no paths" }, { status: 400 });
  }
  if (paths.length > 6) {
    // 6 covers home + list + detail across multiple domains — anything
    // bigger is almost certainly a bug or abuse.
    return NextResponse.json({ error: "too many paths" }, { status: 400 });
  }

  // ---- Revalidate (filter to allow-list) ----
  const revalidated: string[] = [];
  const rejected: string[] = [];
  for (const p of paths) {
    if (typeof p !== "string" || !pathIsAllowed(p)) {
      rejected.push(p);
      continue;
    }
    try {
      revalidatePath(p);
      revalidated.push(p);
    } catch {
      rejected.push(p);
    }
  }

  return NextResponse.json({ ok: true, revalidated, rejected, uid });
}
