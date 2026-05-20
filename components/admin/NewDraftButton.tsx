"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  createBlankDraft,
  DRAFT_COLLECTION,
  type DraftDomain,
} from "@/lib/admin/createDraft";

// Single button used in the 4 domain list headers. Creates a DRAFT and
// navigates straight to the editor — operator fills the required fields
// there.
export function NewDraftButton({
  domain,
  label = "신규 등록",
}: {
  domain: DraftDomain;
  label?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!user?.uid) return;
    setBusy(true);
    try {
      const ref = await createBlankDraft(domain, user.uid);
      router.push(`/admin/${DRAFT_COLLECTION[domain]}/${ref.id}`);
    } catch (err) {
      console.error("[NewDraftButton] create failed:", err);
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={handleClick}
      disabled={busy || !user?.uid}
      className="shrink-0"
    >
      {busy ? (
        <>
          <Loader2 className="size-4 mr-1.5 animate-spin" />
          생성 중…
        </>
      ) : (
        <>
          <Plus className="size-4 mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}
