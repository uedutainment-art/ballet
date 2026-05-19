"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORY_LABELS } from "@/lib/types/competition";

type Period = "" | "this_week" | "this_month" | "three_months";

const PERIOD_LABELS: Record<Period, string> = {
  "": "전체 기간",
  this_week: "이번 주",
  this_month: "이번 달",
  three_months: "3개월 이내",
};

export function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [period, setPeriod] = useState<Period>(
    (sp.get("period") as Period) ?? "",
  );
  const [search, setSearch] = useState(sp.get("search") ?? "");

  function apply(next: { category?: string; period?: Period; search?: string }) {
    const params = new URLSearchParams(sp.toString());
    const setOrDelete = (key: string, value: string | undefined) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("category", next.category ?? category);
    setOrDelete("period", next.period ?? period);
    setOrDelete("search", next.search ?? search);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/competitions?${qs}` : "/competitions");
    });
  }

  function reset() {
    setCategory("");
    setPeriod("");
    setSearch("");
    startTransition(() => router.replace("/competitions"));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
      className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3 bg-white border border-border rounded-md p-3"
    >
      <Select
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          apply({ category: e.target.value });
        }}
        className="md:max-w-[180px]"
        aria-label="카테고리"
      >
        <option value="">전체 카테고리</option>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
          (k) => (
            <option key={k} value={k}>
              {CATEGORY_LABELS[k]}
            </option>
          ),
        )}
      </Select>

      <Select
        value={period}
        onChange={(e) => {
          const v = e.target.value as Period;
          setPeriod(v);
          apply({ period: v });
        }}
        className="md:max-w-[160px]"
        aria-label="기간"
      >
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABELS[p]}
          </option>
        ))}
      </Select>

      <Input
        type="search"
        placeholder="대회명 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="md:flex-1"
        aria-label="검색"
      />

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="md">
          적용
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={reset}>
          초기화
        </Button>
      </div>
    </form>
  );
}
