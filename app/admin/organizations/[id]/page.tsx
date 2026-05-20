"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getOrganizationById } from "@/lib/firebase/queries";
import { recordEdit } from "@/lib/firebase/editLogs";
import { useAuth } from "@/components/providers/AuthProvider";
import { OrgFieldsPane } from "@/components/admin/OrgFieldsPane";
import { OrgLogoSection } from "@/components/admin/OrgLogoSection";
import { SourcePane } from "@/components/admin/SourcePane";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionBar } from "@/components/admin/StatusTransitionBar";
import { useAutosave } from "@/lib/admin/useAutosave";
import { useShortcuts } from "@/lib/admin/useShortcuts";
import {
  organizationFormSchema,
  type OrganizationFormValues,
} from "@/lib/zod/organization";
import {
  transitionToArchived,
  transitionToHold,
  transitionToInReview,
  transitionToPublished,
  transitionToReady,
} from "@/lib/admin/transitions";
import { isAdminOrAbove } from "@/lib/types/user";
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  type Organization,
} from "@/lib/types/organization";
import type { ContentStatus } from "@/lib/types/status";

function orgToForm(o: Organization): OrganizationFormValues {
  return {
    name: o.name ?? "",
    shortName: o.shortName ?? "",
    englishName: o.englishName ?? "",
    aliasesCsv: (o.aliases ?? []).join(", "),
    type: o.type,
    websiteUrl: o.websiteUrl ?? "",
    email: o.email ?? "",
    phone: o.phone ?? "",
    address: o.address ?? "",
    region: o.region ?? "",
    description: o.description ?? "",
    establishedYear: o.establishedYear,
    instagramUrl: o.socialLinks?.instagram ?? "",
    youtubeUrl: o.socialLinks?.youtube ?? "",
    facebookUrl: o.socialLinks?.facebook ?? "",
    tagsCsv: (o.tags ?? []).join(", "),
    status: o.status,
    notes: o.notes ?? "",
  };
}

function formToPatch(v: OrganizationFormValues): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    name: v.name,
    type: v.type,
    status: v.status,
    aliases: (v.aliasesCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    tags: (v.tagsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    shortName: v.shortName ?? "",
    englishName: v.englishName ?? "",
    websiteUrl: v.websiteUrl ?? "",
    email: v.email ?? "",
    phone: v.phone ?? "",
    address: v.address ?? "",
    region: v.region ?? "",
    description: v.description ?? "",
    notes: v.notes ?? "",
  };
  if (v.establishedYear !== undefined && !Number.isNaN(v.establishedYear)) {
    patch.establishedYear = v.establishedYear;
  }
  // socialLinks nested object — strip empty.
  const social: Record<string, string> = {};
  if (v.instagramUrl) social.instagram = v.instagramUrl;
  if (v.youtubeUrl) social.youtube = v.youtubeUrl;
  if (v.facebookUrl) social.facebook = v.facebookUrl;
  patch.socialLinks = social;
  return patch;
}

function diffKeys(
  before: OrganizationFormValues,
  after: OrganizationFormValues,
): string[] {
  const keys = Object.keys(after) as Array<keyof OrganizationFormValues>;
  return keys.filter((k) => before[k] !== after[k]);
}

export default function OrgEditorPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user, userDoc } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // logoCandidates is a transient extraction artifact — captured from the
  // most recent AI re-extract; not stored on the org doc itself.
  const [logoCandidates, setLogoCandidates] = useState<string[]>([]);

  const methods = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  const [lastSavedValues, setLastSavedValues] =
    useState<OrganizationFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const o = await getOrganizationById(params.id);
      if (cancelled) return;
      setOrg(o);
      if (o) {
        const formValues = orgToForm(o);
        methods.reset(formValues);
        setLastSavedValues(formValues);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const canPublish = isAdminOrAbove(userDoc?.role);
  const actor = useMemo(
    () => ({
      uid: user?.uid ?? "",
      displayName: userDoc?.displayName ?? user?.email ?? "운영자",
    }),
    [user?.uid, userDoc?.displayName, user?.email],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (!org) return;
    const ok = await methods.trigger();
    if (!ok) {
      showToast("필수 항목을 확인해 주세요");
      throw new Error("validation failed");
    }
    const values = methods.getValues();
    const patch = formToPatch(values);
    patch.lastUpdatedAt = serverTimestamp();
    patch.updatedAt = serverTimestamp();
    await updateDoc(doc(db, "organizations", org.id), patch);

    const changed = lastSavedValues
      ? diffKeys(lastSavedValues, values)
      : Object.keys(values);
    if (changed.length > 0 && user?.uid) {
      await recordEdit({
        docRef: `organizations/${org.id}`,
        docType: "organization",
        docTitle: values.name || org.name,
        userId: actor.uid,
        userDisplayName: actor.displayName,
        fromStatus: org.workflowState,
        toStatus: org.workflowState,
        changedFields: changed,
      });
    }

    setLastSavedValues(values);
    methods.reset(values, { keepDirty: false });
  }, [org, methods, lastSavedValues, actor, showToast, user?.uid]);

  const watched = methods.watch();
  const changeMarker = JSON.stringify(watched);
  const dirty = methods.formState.isDirty;

  const autosaveStatus = useAutosave({
    changeMarker,
    dirty,
    save: async () => {
      try {
        await save();
      } catch {
        // swallowed
      }
    },
  });

  const runTransition = useCallback(
    async (
      label: string,
      fn: (
        ctx: {
          id: string;
          docTitle: string;
          fromStatus: ContentStatus;
          collection: string;
          docType: "organization";
          statusField?: "status" | "workflowState";
        },
        actor: { uid: string; displayName: string },
      ) => Promise<void>,
    ) => {
      if (!org || !user?.uid) return;
      setBusy(true);
      try {
        await fn(
          {
            id: org.id,
            docTitle: methods.getValues("name") || org.name,
            fromStatus: org.workflowState,
            collection: "organizations",
            docType: "organization",
            statusField: "workflowState",
          },
          actor,
        );
        const fresh = await getOrganizationById(org.id);
        if (fresh) setOrg(fresh);
        showToast(label);
      } catch (err) {
        console.error(err);
        showToast("처리 실패");
      } finally {
        setBusy(false);
      }
    },
    [org, user?.uid, actor, methods, showToast],
  );

  const onReady = useCallback(async () => {
    if (!org) return;
    if (org.workflowState === "DRAFT" || org.workflowState === "IN_REVIEW") {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (org.workflowState === "READY") {
      await runTransition("공개됐어요", transitionToPublished);
    }
  }, [org, runTransition]);

  const onPublish = useCallback(
    () => runTransition("공개됐어요", transitionToPublished),
    [runTransition],
  );
  const onHold = useCallback(
    () => runTransition("보류로 전환했어요", transitionToHold),
    [runTransition],
  );
  const onArchive = useCallback(
    () => runTransition("보관함으로 옮겼어요", transitionToArchived),
    [runTransition],
  );

  // Auto-move DRAFT → IN_REVIEW on first edit (mirrors competitions/admissions).
  useEffect(() => {
    if (!org || org.workflowState !== "DRAFT" || !dirty || !user?.uid) return;
    void runTransition("검수 시작", transitionToInReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.workflowState, dirty]);

  const onReExtracted = useCallback(
    async (res: {
      fieldsUpdated: string[];
      confidence: number;
      // The Cloud Function adds an extra optional field for orgs.
      logoCandidates?: string[];
    }) => {
      if (!org) return;
      const fresh = await getOrganizationById(org.id);
      if (fresh) {
        setOrg(fresh);
        const values = orgToForm(fresh);
        methods.reset(values);
        setLastSavedValues(values);
      }
      if (Array.isArray(res.logoCandidates) && res.logoCandidates.length > 0) {
        setLogoCandidates(res.logoCandidates);
      }
      if (res.fieldsUpdated.length > 0) {
        setRecentlyUpdated(new Set(res.fieldsUpdated));
        setTimeout(() => setRecentlyUpdated(new Set()), 1800);
        showToast(
          `${res.fieldsUpdated.length}개 필드 갱신됨 · 신뢰도 ${Math.round(res.confidence * 100)}%`,
        );
      } else if (
        Array.isArray(res.logoCandidates) &&
        res.logoCandidates.length > 0
      ) {
        showToast(`로고 후보 ${res.logoCandidates.length}개 발견됨`);
      }
    },
    [org, methods, showToast],
  );

  useShortcuts({
    onSave: () => {
      void save().catch(() => {});
    },
    onReady,
    onHold,
  });

  if (loading) {
    return <div className="text-sm text-warm-gray">불러오는 중…</div>;
  }
  if (!org) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/organizations"
          className="text-xs text-brand hover:underline"
        >
          ← 목록으로
        </Link>
      </div>
    );
  }

  const accentColor = ORG_TYPE_COLORS[org.type];

  return (
    <FormProvider {...methods}>
      <div className="space-y-4 relative pb-4">
        <nav className="text-xs text-warm-gray">
          <Link href="/admin/organizations" className="hover:text-ink">
            기관 데이터베이스
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{org.name}</span>
        </nav>

        <header className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-serif text-ink">{org.name}</h1>
          <StatusBadge status={org.workflowState} />
          <span className="text-xs text-warm-gray">
            {ORG_TYPE_LABELS[org.type]}
            {org.region ? ` · ${org.region}` : ""}
          </span>
          {org.status === "INACTIVE" ? (
            <span className="text-[10px] tracking-wider text-warm-gray/60 uppercase">
              비활성
            </span>
          ) : null}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push("/admin/organizations")}
            className="text-xs text-warm-gray hover:text-ink"
          >
            ← 목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-start">
          <SourcePane
            target={{
              id: org.id,
              domain: "organization",
              logoUrl: org.logoUrl,
              primaryLabel: org.name,
              accentColorFrom: accentColor,
              accentColorTo: accentColor,
              accentLabel: ORG_TYPE_LABELS[org.type],
            }}
            onReExtracted={onReExtracted}
          />
          <OrgFieldsPane
            aiConfidence={org.aiConfidence}
            aiFieldNotes={org.aiFieldNotes}
            autosave={autosaveStatus}
            recentlyUpdated={recentlyUpdated}
            logoSection={
              <OrgLogoSection
                orgId={org.id}
                orgName={org.name}
                currentLogoUrl={org.logoUrl}
                candidates={logoCandidates}
                onLogoUpdated={(newUrl) => {
                  setOrg((prev) =>
                    prev ? { ...prev, logoUrl: newUrl ?? undefined } : prev,
                  );
                  if (newUrl) showToast("로고가 저장됐어요");
                }}
              />
            }
          />
        </div>

        <StatusTransitionBar
          status={org.workflowState}
          dirty={dirty}
          canPublish={canPublish}
          busy={busy}
          onSave={() => {
            void save().catch(() => {});
          }}
          onReady={onReady}
          onPublish={onPublish}
          onHold={onHold}
          onArchive={onArchive}
        />

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-xs px-4 py-2 rounded-sm shadow-lg z-50">
            {toast}
          </div>
        ) : null}
      </div>
    </FormProvider>
  );
}
