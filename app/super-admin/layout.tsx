"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Crown, LogOut, ArrowLeft } from "lucide-react";

/**
 * Platform shell — deliberately separate from the workspace
 * (dashboard) shell. No company sidebar, no trial banner: this area
 * administers all tenants, it doesn't belong to one.
 */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/super-admin/login";

  useEffect(() => {
    if (loading || isLoginRoute) return;
    if (!user) {
      router.push("/super-admin/login");
      return;
    }
    if ((user.role as string) !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, loading, router, isLoginRoute]);

  // The sign-in page renders unwalled — it IS the gate.
  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading || !user || (user.role as string) !== "super_admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0b1220]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-300 border-t-transparent" aria-label="Loading platform" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/super-admin/login");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between bg-[#0b1220] px-4 sm:px-6">
        <Link href="/super-admin" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-display text-[15px] font-semibold text-[#0b1220]" aria-hidden>
            N
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[15px] font-semibold text-white">NexusHR Platform</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Crown size={11} /> Super admin
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="tabular hidden max-w-[160px] truncate text-sm text-slate-300 sm:block">
            {user.email}
          </span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="px-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline sm:ml-2">Log out</span>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <div className="ledger-enter mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
