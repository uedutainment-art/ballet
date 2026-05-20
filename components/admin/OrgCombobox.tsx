"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { searchOrganizationsForCombobox } from "@/lib/firebase/queries";
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  type Organization,
  type OrgType,
} from "@/lib/types/organization";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type Props = {
  // The two-way pairing is intentional: we always update the denormalized name
  // string AND the orgId pointer so UI doesn't need a join to render.
  value?: string; // orgId
  name?: string;  // denormalized display name
  onChange: (orgId: string | undefined, orgName: string) => void;
  typeFilter?: OrgType | OrgType[]; // restrict autocomplete pool
  placeholder?: string;
  label?: string;
  // Default type for "create new" path (e.g. COMPETITION_HOST for the
  // competition form's host slot).
  createAsType?: OrgType;
  allowCreate?: boolean;
};

// Combobox that autocompletes from /organizations. Picks an existing org or
// (optionally) creates a new DRAFT one inline.
export function OrgCombobox({
  value,
  name,
  onChange,
  typeFilter,
  placeholder,
  label,
  createAsType,
  allowCreate = true,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(name ?? "");
  const [results, setResults] = useState<Organization[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Keep the input in sync if the parent passes a new name (e.g. after a
  // re-extract overwrites the field).
  useEffect(() => {
    setQuery(name ?? "");
  }, [name]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runSearch = useCallback(
    async (needle: string) => {
      setSearching(true);
      try {
        const rows = await searchOrganizationsForCombobox(
          needle,
          typeFilter,
          10,
        );
        setResults(rows);
      } finally {
        setSearching(false);
      }
    },
    [typeFilter],
  );

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      void runSearch(query);
    }, 150);
    return () => clearTimeout(handle);
  }, [query, open, runSearch]);

  function pick(o: Organization) {
    onChange(o.id, o.name);
    setQuery(o.name);
    setOpen(false);
  }

  function clear() {
    onChange(undefined, "");
    setQuery("");
    setOpen(false);
  }

  async function createNew() {
    if (!user?.uid || !query.trim() || !allowCreate) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "organizations"), {
        name: query.trim(),
        type: createAsType ?? "OTHER",
        aliases: [],
        tags: [],
        status: "ACTIVE",
        workflowState: "DRAFT",
        source: "manual",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });
      onChange(ref.id, query.trim());
      setOpen(false);
    } catch (err) {
      console.error("[OrgCombobox] createNew failed:", err);
    } finally {
      setCreating(false);
    }
  }

  const trimmed = query.trim();
  const exactMatch = results.some((r) => r.name === trimmed);
  const canCreate = allowCreate && trimmed.length > 0 && !exactMatch;

  return (
    <div ref={wrapRef} className="relative">
      {label ? (
        <div className="text-xs text-warm-gray mb-1">{label}</div>
      ) : null}
      <div className="flex items-center gap-1">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Typing without picking detaches from the previous org pointer —
            // the user is rewriting the denormalized name, so clear orgId
            // unless they pick from the list.
            if (value) onChange(undefined, e.target.value);
            else onChange(undefined, e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "기관 이름으로 검색…"}
          className="flex-1"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="text-warm-gray hover:text-red-600 px-1.5"
            title="연결 해제"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {value ? (
        <div className="mt-1 text-[10px] text-green-700">
          ✓ 기관 연결됨 — orgId: <code className="font-mono">{value}</code>
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-border rounded-sm shadow-md max-h-72 overflow-y-auto">
          {searching ? (
            <div className="px-3 py-2 text-xs text-warm-gray flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              검색 중…
            </div>
          ) : results.length === 0 && !canCreate ? (
            <div className="px-3 py-2 text-xs text-warm-gray">
              일치하는 기관이 없어요
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-cream-start/50 flex items-center gap-2"
                  >
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ORG_TYPE_COLORS[r.type] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink truncate">{r.name}</div>
                      <div className="text-[10px] text-warm-gray mt-0.5">
                        {ORG_TYPE_LABELS[r.type]}
                        {r.region ? ` · ${r.region}` : ""}
                        {r.shortName ? ` · ${r.shortName}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {canCreate ? (
                <li>
                  <button
                    type="button"
                    onClick={createNew}
                    disabled={creating}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center gap-2",
                      "hover:bg-brand/5 text-brand disabled:opacity-50",
                    )}
                  >
                    {creating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    <span>
                      &quot;<span className="font-medium">{trimmed}</span>&quot; 새 기관으로 등록
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
