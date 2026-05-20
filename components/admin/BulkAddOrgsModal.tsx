"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, Sparkles, X } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { callReExtract } from "@/lib/admin/reExtract";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

type Row = {
  url: string;
  status: "pending" | "creating" | "extracting" | "done" | "error";
  docId?: string;
  error?: string;
};

// Bulk-create org docs from a list of URLs. Each URL becomes one DRAFT org;
// then the extractFromInput Cloud Function is invoked per row to populate
// fields from the page text. AI noise (timeouts, page blocks) is logged
// per-row and doesn't halt the batch.
export function BulkAddOrgsModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  function parseUrls(): string[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//.test(line))
      .slice(0, 25); // cap so a paste accident doesn't burn the rate limit
  }

  async function run() {
    if (!user?.uid) return;
    const urls = parseUrls();
    if (urls.length === 0) return;
    setRunning(true);
    const initial: Row[] = urls.map((url) => ({ url, status: "pending" }));
    setRows(initial);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "creating" } : r)),
      );

      let docId: string | undefined;
      try {
        // Create a placeholder DRAFT doc — the AI extract step will overwrite
        // the name/type/etc. as it succeeds.
        const ref = await addDoc(collection(db, "organizations"), {
          name: `(미설정) ${url}`,
          type: "OTHER",
          aliases: [],
          tags: [],
          status: "ACTIVE",
          workflowState: "DRAFT",
          source: "manual",
          websiteUrl: url,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
        });
        docId = ref.id;
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error",
                  error: err instanceof Error ? err.message : "생성 실패",
                }
              : r,
          ),
        );
        continue;
      }

      setRows((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: "extracting", docId } : r,
        ),
      );

      try {
        await callReExtract({
          docId,
          domain: "organization",
          mode: "url",
          applyMode: "fill_empty",
          payload: { url },
        });
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "done", docId } : r,
          ),
        );
      } catch (err) {
        // Doc still exists — operator can finish it manually.
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error",
                  error:
                    err instanceof Error ? err.message : "AI 추출 실패",
                  docId,
                }
              : r,
          ),
        );
      }
    }

    setRunning(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-border rounded-md w-full max-w-2xl max-h-[80vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-sm font-medium text-ink">URL 일괄 추가</div>
            <div className="text-xs text-warm-gray mt-0.5">
              기관 공식 사이트 URL을 한 줄에 하나씩 (최대 25개)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="text-warm-gray hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-4 space-y-3 overflow-y-auto">
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"https://www.karts.ac.kr\nhttps://www.ewha.ac.kr\n..."}
            disabled={running}
          />
          <div className="text-[11px] text-warm-gray text-right">
            인식된 URL: {parseUrls().length}개
          </div>

          {rows.length > 0 ? (
            <ul className="text-xs space-y-1 max-h-56 overflow-y-auto border border-border rounded-sm p-2">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <StatusDot status={r.status} />
                  <span className="flex-1 truncate text-warm-gray" title={r.url}>
                    {r.url}
                  </span>
                  {r.docId ? (
                    <a
                      href={`/admin/organizations/${r.docId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline text-[11px]"
                    >
                      열기 ↗
                    </a>
                  ) : null}
                  {r.error ? (
                    <span className="text-red-600 text-[10px] truncate" title={r.error}>
                      {r.error}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={running}
          >
            닫기
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={run}
            disabled={running || parseUrls().length === 0}
          >
            {running ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                처리 중…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 mr-1.5" />
                AI 추출 시작 ({parseUrls().length}개)
              </>
            )}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Row["status"] }) {
  switch (status) {
    case "pending":
      return <span className="size-1.5 rounded-full bg-warm-gray/30" />;
    case "creating":
      return (
        <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
      );
    case "extracting":
      return (
        <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
      );
    case "done":
      return <span className="size-1.5 rounded-full bg-green-500" />;
    case "error":
      return <span className="size-1.5 rounded-full bg-red-500" />;
  }
}
