// M11.7: external inquiry submission endpoint (httpsCallable).
//
// Pipeline:
//   1. Validate input (zod-equivalent inline checks — keeps function
//      bundle small without pulling zod runtime).
//   2. reCAPTCHA v3 verification (skipped when RECAPTCHA_SECRET not set —
//      lets us deploy + iterate the UI before keys are provisioned).
//   3. Per-IP rate limit (3/min, 20/hr) via Firestore transaction.
//   4. Attachment upload to /inquiries/{id}/* (image/* or PDF, ≤10MB).
//   5. Firestore write + acknowledgment email + admin notification.
//
// All gates are best-effort: a missing optional service (Resend, reCAPTCHA)
// degrades to a warning log so the channel keeps working in early-beta.

import {randomUUID, createHash} from "node:crypto";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

if (getApps().length === 0) {
  initializeApp();
}

const RECAPTCHA_SECRET = defineSecret("RECAPTCHA_SECRET_KEY");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

type InquiryType =
  | "NEW_CONTENT"
  | "EDIT_REQUEST"
  | "DELETE_REQUEST"
  | "ORG_UPDATE"
  | "GENERAL";

const VALID_TYPES: InquiryType[] = [
  "NEW_CONTENT",
  "EDIT_REQUEST",
  "DELETE_REQUEST",
  "ORG_UPDATE",
  "GENERAL",
];

const INQUIRY_TYPE_LABELS_KO: Record<InquiryType, string> = {
  NEW_CONTENT: "신규 콘텐츠 제보",
  EDIT_REQUEST: "정보 수정 요청",
  DELETE_REQUEST: "삭제 요청",
  ORG_UPDATE: "기관 정보 수정",
  GENERAL: "일반 문의",
};

type CallRequest = {
  type: InquiryType;
  subject: string;
  message: string;
  email?: string;
  recaptchaToken?: string;
  attachmentBase64?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  attachmentSizeBytes?: number;
  contentRef?: {
    domain: string;
    docId: string;
    title: string;
  };
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ADMIN_NOTIFICATION_EMAIL = "uedutainment@gmail.com";
const ADMIN_BASE_URL = "https://ballet-kappa.vercel.app";
const FROM_ADDRESS = "K BALLET <noreply@kballet.kr>";
const FALLBACK_FROM = "K BALLET <onboarding@resend.dev>"; // works without domain verification

function hashIp(ip: string | undefined): string {
  return createHash("sha256")
    .update((ip ?? "anon").trim())
    .digest("hex")
    .slice(0, 24);
}

async function verifyRecaptcha(
  token: string | undefined,
  secret: string | undefined,
): Promise<number | null> {
  if (!secret) {
    logger.info("[inquiry] reCAPTCHA secret not configured — skipping verification");
    return null;
  }
  if (!token) {
    throw new HttpsError("failed-precondition", "reCAPTCHA 토큰이 없어요");
  }
  try {
    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {"content-type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({secret, response: token}).toString(),
    });
    const data = (await resp.json()) as {
      success?: boolean;
      score?: number;
      "error-codes"?: string[];
    };
    if (!data.success) {
      logger.warn("[inquiry] reCAPTCHA failed", {errors: data["error-codes"]});
      throw new HttpsError("failed-precondition", "스팸 검증에 실패했어요");
    }
    return typeof data.score === "number" ? data.score : 1;
  } catch (err) {
    logger.error("[inquiry] reCAPTCHA call failed", {err});
    throw new HttpsError("failed-precondition", "스팸 검증에 실패했어요");
  }
}

async function checkRateLimit(
  ipHash: string,
  limits: {perMinute: number; perHour: number},
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("rateLimits").doc(ipHash);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const events = (snap.exists ? snap.data()?.events : []) as
      | number[]
      | undefined;
    const recent = (events ?? []).filter(
      (t) => Date.now() - t < 60 * 60 * 1000,
    );
    const lastMinute = recent.filter((t) => Date.now() - t < 60 * 1000);
    if (lastMinute.length >= limits.perMinute) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
      );
    }
    if (recent.length >= limits.perHour) {
      throw new HttpsError(
        "resource-exhausted",
        "시간당 제출 한도를 초과했어요. 한 시간 뒤 다시 시도해 주세요.",
      );
    }
    tx.set(
      ref,
      {events: [...recent, Date.now()]},
      {merge: false},
    );
  });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣._-]+/g, "_").slice(0, 80) || "file";
}

async function uploadAttachment(
  inquiryId: string,
  base64: string,
  fileName: string,
  contentType: string,
  declaredSize: number | undefined,
): Promise<{
  storageUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}> {
  const isImage = contentType.startsWith("image/");
  const isPdf = contentType === "application/pdf";
  if (!isImage && !isPdf) {
    throw new HttpsError(
      "invalid-argument",
      "이미지 또는 PDF만 첨부 가능해요",
    );
  }
  const buf = Buffer.from(base64, "base64");
  if (buf.length > MAX_ATTACHMENT_BYTES) {
    throw new HttpsError("invalid-argument", "10MB 이하 파일만 가능해요");
  }
  if (typeof declaredSize === "number" && declaredSize > MAX_ATTACHMENT_BYTES) {
    throw new HttpsError("invalid-argument", "10MB 이하 파일만 가능해요");
  }

  const safe = sanitizeFileName(fileName);
  const objectPath = `inquiries/${inquiryId}/${safe}`;
  const bucket = getStorage().bucket("ballet-d0d4c.firebasestorage.app");
  const token = randomUUID();

  await bucket.file(objectPath).save(buf, {
    contentType,
    metadata: {
      contentType,
      metadata: {
        inquiryId,
        uploadedAt: new Date().toISOString(),
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const storageUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
    `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

  return {
    storageUrl,
    fileName: safe,
    contentType,
    sizeBytes: buf.length,
  };
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmailViaResend(
  params: SendEmailParams,
  apiKey: string | undefined,
): Promise<void> {
  if (!apiKey) {
    logger.info("[inquiry] Resend key not configured — email skipped", {
      to: params.to,
      subject: params.subject,
    });
    return;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!resp.ok) {
      // Domain might not be verified yet — retry with the Resend sandbox sender.
      const fb = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: FALLBACK_FROM,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });
      if (!fb.ok) {
        logger.warn("[inquiry] Resend send failed", {
          status: fb.status,
          body: await fb.text().catch(() => ""),
        });
      }
    }
  } catch (err) {
    logger.warn("[inquiry] Resend call threw", {err});
  }
}

function acknowledgmentHtml(params: {
  inquiryId: string;
  subject: string;
  type: InquiryType;
}): string {
  const typeLabel = INQUIRY_TYPE_LABELS_KO[params.type];
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fdf8f3;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2C3E4A;">
  <div style="font-family:'Noto Serif KR',serif;font-size:18px;margin:0 0 16px;letter-spacing:1px;">K BALLET &amp; CO.</div>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">제보를 접수했어요. 검토 후 1~3일 내에 안내드릴게요.</p>
  <div style="background:#fff;border:1px solid #E8E3D8;padding:16px;margin:0 0 24px;border-radius:6px;">
    <div style="font-size:13px;margin:0 0 6px;"><strong>유형:</strong> ${typeLabel}</div>
    <div style="font-size:13px;margin:0;"><strong>제목:</strong> ${escapeHtml(params.subject)}</div>
  </div>
  <p style="font-size:12px;color:#8A8579;margin:24px 0 0;">접수번호: ${params.inquiryId.slice(0, 8)}</p>
  <hr style="border:none;border-top:1px solid #E8E3D8;margin:24px 0 12px;">
  <p style="font-size:11px;color:#8A8579;margin:0;">K BALLET &amp; CO. · 발레 정보 게이트웨이</p>
</div>
</body></html>`;
}

function adminNotificationHtml(params: {
  inquiryId: string;
  type: InquiryType;
  subject: string;
  email?: string;
  hasAttachment: boolean;
}): string {
  const typeLabel = INQUIRY_TYPE_LABELS_KO[params.type];
  return `<!doctype html><html><body>
<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h3 style="margin:0 0 12px;">새 제보 도착</h3>
  <p><strong>유형:</strong> ${typeLabel}</p>
  <p><strong>제목:</strong> ${escapeHtml(params.subject)}</p>
  ${params.email ? `<p><strong>제보자 이메일:</strong> ${escapeHtml(params.email)}</p>` : ""}
  ${params.hasAttachment ? "<p><strong>📎 첨부 있음</strong></p>" : ""}
  <p><a href="${ADMIN_BASE_URL}/admin/inquiries/${params.inquiryId}" style="display:inline-block;background:#6E7D8A;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">큐에서 열기 →</a></p>
</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const submitInquiry = onCall<CallRequest>(
  {
    region: "asia-northeast3",
    secrets: [RECAPTCHA_SECRET, RESEND_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: true,
  },
  async (req) => {
    const data = req.data ?? {};

    // ---- Validate ----
    if (!data.type || !VALID_TYPES.includes(data.type)) {
      throw new HttpsError("invalid-argument", "유형을 선택해 주세요");
    }
    const subject = (data.subject ?? "").trim();
    const message = (data.message ?? "").trim();
    if (subject.length < 2 || subject.length > 200) {
      throw new HttpsError("invalid-argument", "제목은 2~200자로 입력해 주세요");
    }
    if (message.length < 10 || message.length > 3000) {
      throw new HttpsError("invalid-argument", "내용은 10~3000자로 입력해 주세요");
    }
    const email = (data.email ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "이메일 형식이 올바르지 않아요");
    }

    // ---- reCAPTCHA (optional during early-beta) ----
    let recaptchaSecret: string | undefined;
    try {
      recaptchaSecret = RECAPTCHA_SECRET.value();
    } catch {
      recaptchaSecret = undefined;
    }
    const score = await verifyRecaptcha(data.recaptchaToken, recaptchaSecret);
    if (score !== null && score < 0.5) {
      logger.warn("[inquiry] reCAPTCHA score below threshold", {score});
      throw new HttpsError(
        "failed-precondition",
        "스팸으로 분류됐어요. 다시 시도해 주세요.",
      );
    }

    // ---- Rate limit ----
    const rawIp =
      (req.rawRequest?.headers?.["x-forwarded-for"] as string | undefined)?.split(
        ",",
      )[0]?.trim() ||
      req.rawRequest?.ip ||
      "anon";
    const ipHash = hashIp(rawIp);
    await checkRateLimit(ipHash, {perMinute: 3, perHour: 20});

    // ---- Pre-allocate inquiry id so the attachment path can reference it ----
    const db = getFirestore();
    const ref = db.collection("inquiries").doc();

    // ---- Attachment ----
    let attachments: Array<Record<string, unknown>> = [];
    if (data.attachmentBase64 && data.attachmentFileName && data.attachmentContentType) {
      const att = await uploadAttachment(
        ref.id,
        data.attachmentBase64,
        data.attachmentFileName,
        data.attachmentContentType,
        data.attachmentSizeBytes,
      );
      attachments = [att];
    }

    // ---- Persist ----
    const doc: Record<string, unknown> = {
      type: data.type,
      subject,
      message,
      email: email || null,
      attachments,
      contentRef: data.contentRef ?? null,
      status: "NEW",
      submitterIpHash: ipHash,
      userAgent:
        (req.rawRequest?.headers?.["user-agent"] as string | undefined) ?? "",
      recaptchaScore: score,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await ref.set(doc);

    logger.info("[inquiry] received", {
      id: ref.id,
      type: data.type,
      hasEmail: Boolean(email),
      hasAttachment: attachments.length > 0,
      score,
    });

    // ---- Send acknowledgment + admin notification ----
    let resendKey: string | undefined;
    try {
      resendKey = RESEND_API_KEY.value();
    } catch {
      resendKey = undefined;
    }

    if (email) {
      await sendEmailViaResend(
        {
          to: email,
          subject: "[K BALLET] 제보를 접수했어요",
          html: acknowledgmentHtml({
            inquiryId: ref.id,
            subject,
            type: data.type,
          }),
        },
        resendKey,
      );
      await ref.update({acknowledgedAt: FieldValue.serverTimestamp()});
    }

    await sendEmailViaResend(
      {
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `[K BALLET 제보] ${INQUIRY_TYPE_LABELS_KO[data.type]} · ${subject}`,
        html: adminNotificationHtml({
          inquiryId: ref.id,
          type: data.type,
          subject,
          email: email || undefined,
          hasAttachment: attachments.length > 0,
        }),
      },
      resendKey,
    );

    return {inquiryId: ref.id};
  },
);
