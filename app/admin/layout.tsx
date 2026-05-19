"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { Sidebar } from "@/components/admin/Sidebar";
import { isEditorOrAbove } from "@/lib/types/user";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}

function AdminGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userDoc, loading } = useAuth();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(pathname);
      router.replace(`/admin/login?returnTo=${next}`);
      return;
    }
    if (!userDoc || !isEditorOrAbove(userDoc.role)) {
      router.replace("/403");
    }
  }, [isLoginPage, loading, user, userDoc, pathname, router]);

  // Login page: render children directly — no sidebar, no guard.
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-warm-gray text-sm">
        로딩 중…
      </div>
    );
  }

  // Awaiting redirect — render nothing to avoid a flash of forbidden content.
  if (!user || !userDoc || !isEditorOrAbove(userDoc.role)) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userDoc={userDoc} />
      <main className="flex-1 p-6 bg-cream-start/30">{children}</main>
    </div>
  );
}
