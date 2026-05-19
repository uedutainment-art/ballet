"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  url: string;
  className?: string;
};

export function CopyLinkButton({ url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in insecure contexts or older browsers.
      // Fall back: select and prompt — minimal effort, surfaces the URL.
      window.prompt("URL을 복사하세요", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="링크 복사"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink transition-colors",
        className,
      )}
    >
      <Link2 className="size-3.5" />
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}
