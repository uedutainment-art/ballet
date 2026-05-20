"use client";

import Link from "next/link";
import { Bell, Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { label: string; href: string; active?: boolean };

const navItems: NavItem[] = [
  { label: "대회정보", href: "/competitions", active: true },
  { label: "입시정보", href: "/admissions", active: true },
  { label: "공연정보", href: "/performances", active: true },
  { label: "영상", href: "/videos", active: true },
  { label: "기관", href: "/organizations", active: true },
  { label: "정보 제보", href: "/contact", active: true },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-base font-medium tracking-tight text-ink"
        >
          K BALLET &amp; CO.
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm transition-colors",
                item.active
                  ? "text-ink"
                  : "text-[#b8b3a8] hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-warm-gray">
            <button
              type="button"
              aria-label="Search"
              className="hover:text-ink transition-colors"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="hover:text-ink transition-colors"
            >
              <Bell className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Account"
              className="hover:text-ink transition-colors"
            >
              <User className="size-4" />
            </button>
          </div>

          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden text-warm-gray hover:text-ink transition-colors"
            onClick={() => {
              // Mobile Sheet wiring lands in a later step.
              // eslint-disable-next-line no-console
              console.log("mobile menu — Sheet to be wired");
            }}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
