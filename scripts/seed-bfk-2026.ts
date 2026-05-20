// One-off seed: BALLET FESTIVAL KOREA 2026 (제16회 대한민국발레축제) + 정구호의 TALE OF TALES.
//
// Steps:
//   1. Find or create the host organization (대한민국발레축제추진단 / BAFEKO).
//   2. Fetch SAC's show page and pull the og:image to use as the poster.
//   3. Pre-allocate doc IDs for both Performance entries.
//   4. Download the poster bytes into Storage under
//      performances/{festivalDocId}/poster.{ext}, mint a download token.
//   5. Write both Performance docs as DRAFT, sharing the same posterUrl.
//
// Idempotent: re-running with the same title skips creation.
//
// Usage: pnpm tsx scripts/seed-bfk-2026.ts

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function loadEnvLocal() {
  try {
    const txt = readFileSync(
      path.resolve(process.cwd(), ".env.local"),
      "utf-8",
    );
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* OK */
  }
}

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    initializeApp({
      credential: cert(JSON.parse(sa)),
      storageBucket: "ballet-d0d4c.firebasestorage.app",
    });
    return;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
      storageBucket: "ballet-d0d4c.firebasestorage.app",
    });
    return;
  }
  throw new Error(
    "Missing credentials: set FIREBASE_SERVICE_ACCOUNT in .env.local",
  );
}

loadEnvLocal();
initAdmin();

const db = getFirestore();
const now = Timestamp.now();

const SAC_URL = "https://www.sac.or.kr/site/main/show/show_view?SN=73380";
const ORG_ID = "bafeko-festival-committee";
const FESTIVAL_TITLE = "BALLET FESTIVAL KOREA 2026";
const TALE_TITLE = "정구호의 TALE OF TALES";

// --- 1. Find or create host org ---
async function ensureOrganization(): Promise<string> {
  // Try by deterministic id first.
  const ref = db.collection("organizations").doc(ORG_ID);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`org ${ORG_ID} already exists, reusing`);
    return ORG_ID;
  }
  await ref.set({
    name: "대한민국발레축제추진단",
    shortName: "BAFEKO",
    englishName: "Ballet Festival Korea Committee",
    aliases: [
      "BFK",
      "BAFEKO",
      "발레축제",
      "대한민국발레축제",
      "Ballet Festival Korea",
    ],
    type: "ASSOCIATION",
    region: "서울",
    websiteUrl: "https://www.bafeko.or.kr",
    description:
      "한국문화예술위원회 우수 축제로 인정받는 국내 대표 발레 페스티벌 운영 단체.",
    tags: ["발레축제", "협회"],
    status: "ACTIVE",
    workflowState: "PUBLISHED",
    source: "manual",
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    crawlEnabled: false,
    crawlStatus: {
      consecutiveFailures: 0,
      totalCollected: 0,
    },
  });
  console.log(`+ created org ${ORG_ID} (대한민국발레축제추진단)`);
  return ORG_ID;
}

// --- 2. Extract og:image from SAC ---
async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(pageUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KBalletBot/1.0; +https://ballet-kappa.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!resp.ok) {
      console.warn(`fetch SAC failed: ${resp.status}`);
      return null;
    }
    const html = await resp.text();
    // Match common og:image variants — property/name in either order with
    // single or double quotes.
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']og:image["']/i,
    ];
    for (const re of patterns) {
      const m = re.exec(html);
      if (m && m[1]) {
        const url = m[1].trim();
        // Resolve relative URLs against the SAC page.
        try {
          return new URL(url, pageUrl).toString();
        } catch {
          return null;
        }
      }
    }
    // Fallback: first big image in the show-content area. Look for
    // representative-looking img src in the body.
    const imgMatch = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i.exec(html);
    if (imgMatch && imgMatch[1]) {
      try {
        return new URL(imgMatch[1].trim(), pageUrl).toString();
      } catch {
        return null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`fetchOgImage threw: ${(err as Error).message}`);
    return null;
  }
}

// --- 3. Download poster, upload to Storage ---
async function downloadPoster(
  sourceUrl: string,
  performanceId: string,
): Promise<{ url: string; sourceUrl: string } | null> {
  try {
    const resp = await fetch(sourceUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KBalletBot/1.0; +https://ballet-kappa.vercel.app)",
        accept: "image/*",
        // Some hotlink-protected sites require a referer from the same origin.
        referer: SAC_URL,
      },
      redirect: "follow",
    });
    if (!resp.ok) {
      console.warn(`download poster failed: ${resp.status}`);
      return null;
    }
    const ct = (resp.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) {
      console.warn(`poster content-type not image: ${ct}`);
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) {
      console.warn(`poster too large (${buf.length} bytes)`);
      return null;
    }
    let ext = ct.split("/")[1]?.split(";")[0] ?? "jpg";
    if (ext === "jpeg") ext = "jpg";
    if (!/^[a-z0-9]+$/.test(ext)) ext = "jpg";

    const bucket = getStorage().bucket("ballet-d0d4c.firebasestorage.app");
    const objectPath = `performances/${performanceId}/poster.${ext}`;
    const token = randomUUID();
    await bucket.file(objectPath).save(buf, {
      contentType: ct,
      metadata: {
        contentType: ct,
        metadata: {
          posterSourceUrl: sourceUrl,
          downloadedAt: new Date().toISOString(),
          performanceId,
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const publicUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
      `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

    return { url: publicUrl, sourceUrl };
  } catch (err) {
    console.warn(`downloadPoster threw: ${(err as Error).message}`);
    return null;
  }
}

// --- 4. Build doc payloads ---
function buildFestivalDoc(orgId: string, posterUrl?: string, posterSourceUrl?: string) {
  const description = [
    "[제16회 대한민국발레축제 · BALLET FESTIVAL KOREA 2026 · 'Echo']",
    "",
    "2011년 문화체육관광부 지정사업으로 출범해 현재는 한국문화예술위원회 공모사업으로 운영되며, 매년 대한민국공연예술제 우수 축제로 인정받고 있다. 2026년 주제 'Echo: 공명'으로 클래식 발레의 아름다움과 컨템포러리 발레의 실험성, 창작 발레의 개성을 한자리에서 선보인다.",
    "",
    "■ 프로그램 (10편 · 4개 공연장)",
    "",
    "● 예술의전당 오페라극장",
    "  · 심청 — 유니버설발레단 (5.1~5.3)",
    "",
    "● 세종M씨어터",
    "  · In the Bamboo Forest — 서울시발레단 (5.15~5.17)",
    "",
    "● 예술의전당 CJ토월극장",
    "  · 정구호의 TALE OF TALES — 발레축제 기획공연 1 (5.22~5.23)",
    "  · 세비야의 이발사(브라보 휘가로) — 춘천발레단 (5.27)",
    "  · 해적 — 광주시립발레단 (5.30)",
    "  · 피에스타(서울발레시어터) / 프리다(와이즈발레단) — 더블빌 (6.3)",
    "  · 발레아리랑 — 발레축제 기획공연 2 (6.6~6.7)",
    "",
    "● 예술의전당 자유소극장",
    "  · 낫아웃(아함아트프로젝트) / HUMAN(신헌지 B PROJECT) (6.11~6.12)",
    "  · 도깨비잔치(녹색달) / 도깨비의 춤(무브먼트 momm) (6.16~6.17)",
    "  · Essential(부산 아이디 발레단) / 드로셀마이어 Bleak Land(프로젝트 클라우드 나인) (6.20~6.21)",
    "",
    "주관: 대한민국발레축제추진단 · 후원: 한국문화예술위원회",
  ].join("\n");

  const doc: Record<string, unknown> = {
    status: "DRAFT",
    title: FESTIVAL_TITLE,
    company: "대한민국발레축제추진단",
    companyOrgId: orgId,
    companyType: "other",
    venue: "예술의전당 · 세종M씨어터",
    dateStart: Timestamp.fromDate(new Date(2026, 4, 1)),
    dateEnd: Timestamp.fromDate(new Date(2026, 5, 21)),
    showtimes: [], // varies per program — see description
    officialUrl: SAC_URL,
    description,
    source: "manual",
    aiCollectedAt: now,
    createdAt: now,
    lastUpdatedAt: now,
    notes:
      "BFK2026 / 대한민국발레축제 / 발레축제 / Echo — 페스티벌 마스터 엔트리. 개별 프로그램 entry는 별도 등록.",
  };
  if (posterUrl) doc.posterUrl = posterUrl;
  if (posterSourceUrl) doc.posterSourceUrl = posterSourceUrl;
  return doc;
}

function buildTaleDoc(orgId: string, posterUrl?: string, posterSourceUrl?: string) {
  const description = [
    "[BALLET FESTIVAL KOREA 2026 · 제16회 대한민국발레축제 기획공연 1]",
    "",
    "한국을 대표하는 비주얼 디렉터 정구호가 안무·연출을 맡은 발레축제 기획공연. " +
      "동·서양 설화를 발레의 어휘로 풀어내는 60분 단막 신작.",
    "",
    "■ 좌석: R 80,000원 / S 60,000원 / A 30,000원",
    "■ 관람연령: 초등학생 이상",
    "■ 러닝타임: 60분 (인터미션 없음)",
    "■ 문의: 02-580-1896",
    "",
    "주최·주관: 대한민국발레축제추진단 · 후원: 한국문화예술위원회",
  ].join("\n");

  const doc: Record<string, unknown> = {
    status: "DRAFT",
    title: TALE_TITLE,
    company: "대한민국발레축제추진단",
    companyOrgId: orgId,
    companyType: "other",
    venue: "예술의전당 CJ토월극장",
    dateStart: Timestamp.fromDate(new Date(2026, 4, 22)),
    dateEnd: Timestamp.fromDate(new Date(2026, 4, 23)),
    showtimes: ["5/22 19:30", "5/23 14:00", "5/23 19:00"],
    ticketPriceMin: 30000,
    ticketPriceMax: 80000,
    runtime: 60,
    ageLimit: "초등학생 이상",
    choreographer: "정구호",
    officialUrl: SAC_URL,
    description,
    source: "manual",
    aiCollectedAt: now,
    createdAt: now,
    lastUpdatedAt: now,
    notes:
      "BFK2026 / 대한민국발레축제 / 발레축제기획공연 / 정구호 · 문의 02-580-1896",
  };
  if (posterUrl) doc.posterUrl = posterUrl;
  if (posterSourceUrl) doc.posterSourceUrl = posterSourceUrl;
  return doc;
}

// --- Idempotency check ---
async function findExistingByTitle(title: string): Promise<string | null> {
  const snap = await db
    .collection("performances")
    .where("title", "==", title)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

async function run() {
  console.log("→ ensuring host organization...");
  const orgId = await ensureOrganization();

  const existingFestival = await findExistingByTitle(FESTIVAL_TITLE);
  const existingTale = await findExistingByTitle(TALE_TITLE);
  if (existingFestival && existingTale) {
    console.log(
      `\n⚠ both performances already exist (${existingFestival}, ${existingTale}).` +
        " Re-run will skip. Delete from /admin/performances first if you want a fresh insert.",
    );
    return;
  }

  // Pre-allocate refs so we can name the poster under the festival doc id.
  const festivalRef = existingFestival ?
    db.collection("performances").doc(existingFestival) :
    db.collection("performances").doc();
  const taleRef = existingTale ?
    db.collection("performances").doc(existingTale) :
    db.collection("performances").doc();

  console.log("→ fetching og:image from SAC...");
  const ogImageUrl = await fetchOgImage(SAC_URL);
  let posterStorageUrl: string | undefined;
  let posterSource: string | undefined;

  if (ogImageUrl) {
    console.log(`  found: ${ogImageUrl}`);
    console.log("→ downloading poster into Storage...");
    const dl = await downloadPoster(ogImageUrl, festivalRef.id);
    if (dl) {
      posterStorageUrl = dl.url;
      posterSource = dl.sourceUrl;
      console.log(`  uploaded: ${posterStorageUrl}`);
    } else {
      console.log("  download failed — DRAFTs will be created without posterUrl");
    }
  } else {
    console.log("  og:image not found on SAC page — DRAFTs will be created without posterUrl");
  }

  // Write festival
  if (!existingFestival) {
    await festivalRef.set(buildFestivalDoc(orgId, posterStorageUrl, posterSource));
    console.log(`+ created festival DRAFT ${festivalRef.id}`);
  } else {
    console.log(`= festival DRAFT already exists ${festivalRef.id} (skipped)`);
  }

  // Write TALE OF TALES
  if (!existingTale) {
    await taleRef.set(buildTaleDoc(orgId, posterStorageUrl, posterSource));
    console.log(`+ created TALE OF TALES DRAFT ${taleRef.id}`);
  } else {
    console.log(`= TALE OF TALES DRAFT already exists ${taleRef.id} (skipped)`);
  }

  console.log("\n다음:");
  console.log("  · /admin/performances?status=draft 에서 두 entry 확인");
  console.log("  · 포스터 자동 다운로드 실패 시 수동 업로드");
  console.log("  · 검수 후 READY → PUBLISHED");
}

run().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
