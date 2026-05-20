"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, User, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close the overlay whenever the route changes — covers in-menu
  // navigation, browser back, programmatic router.push, etc.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the menu is open so the page underneath doesn't
  // bounce on iOS rubber-band scroll.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC closes the menu (keyboard accessibility).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
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
              aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="md:hidden text-warm-gray hover:text-ink transition-colors p-1 -m-1"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay. Rendered always (visibility toggled via class)
          so the open/close transition can animate. md:hidden keeps it off
          desktop entirely. */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="모바일 메뉴"
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-white transition-opacity duration-200",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        {/* Top bar repeated inside the overlay so brand mark stays anchored
            and the X sits where the hamburger was — minimizes thumb travel. */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-base font-medium tracking-tight text-ink"
              onClick={() => setOpen(false)}
            >
              K BALLET &amp; CO.
            </Link>
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setOpen(false)}
              className="text-warm-gray hover:text-ink transition-colors p-1 -m-1"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <nav className="px-6 pt-6 pb-12 flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-3 rounded-sm font-serif text-lg leading-snug transition-colors",
                  active
                    ? "bg-cream-start text-ink"
                    : item.active
                      ? "text-ink hover:bg-cream-start/60"
                      : "text-[#b8b3a8] hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 pb-8 mt-2 border-t border-border pt-6 text-[11px] text-warm-gray/80 leading-relaxed">
          K BALLET &amp; CO. · 발레의 모든 정보, 한 곳에서.
          <br />
          정보 제보 · 수정 ·{" "}
          <a
            href="mailto:uedutainment@gmail.com"
            className="text-brand hover:underline"
          >
            uedutainment@gmail.com
          </a>
        </div>
      </div>
    </>
  );
}
