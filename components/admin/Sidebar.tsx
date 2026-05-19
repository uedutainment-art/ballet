"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOutUser } from "@/lib/firebase/auth";
import type { UserDoc, UserRole } from "@/lib/types/user";
import { isAdminOrAbove, isSuperAdmin } from "@/lib/types/user";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  enabled: boolean;
  disabledTag?: string;
  visible: (role: UserRole) => boolean;
};

const items: NavItem[] = [
  { label: "대시보드", href: "/admin", enabled: true, visible: () => true },
  {
    label: "콩쿠르",
    href: "/admin/competitions",
    enabled: true,
    visible: () => true,
  },
  {
    label: "입시",
    href: "/admin/admissions",
    enabled: true,
    visible: () => true,
  },
  {
    label: "공연",
    href: "/admin/performances",
    enabled: true,
    visible: () => true,
  },
  {
    label: "영상",
    href: "/admin/videos",
    enabled: false,
    disabledTag: "M7+",
    visible: () => true,
  },
  {
    label: "승인 큐",
    href: "/admin/queue",
    enabled: true,
    visible: (r) => isAdminOrAbove(r),
  },
  {
    label: "사용자 관리",
    href: "/admin/users",
    enabled: true,
    visible: (r) => isSuperAdmin(r),
  },
];

export function Sidebar({ userDoc }: { userDoc: UserDoc }) {
  const pathname = usePathname();
  const router = useRouter();
  const visible = items.filter((i) => i.visible(userDoc.role));

  async function handleSignOut() {
    await signOutUser();
    router.replace("/admin/login");
  }

  return (
    <aside className="w-[200px] shrink-0 bg-ink text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <Link href="/admin" className="font-serif text-sm tracking-[0.15em]">
          K BALLET ADMIN
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {visible.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-sm text-sm text-white/30"
                title="아직 준비 중이에요"
              >
                <span>{item.label}</span>
                {item.disabledTag ? (
                  <span className="text-[10px] tracking-wider text-white/30">
                    {item.disabledTag}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 rounded-sm text-sm transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 text-xs text-white truncate">
          {userDoc.displayName}
        </div>
        <div className="px-3 mt-0.5 text-[10px] tracking-wider text-white/40">
          {userDoc.role}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 w-full inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="size-3.5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
