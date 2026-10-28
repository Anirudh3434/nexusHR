"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { EntitlementsProvider } from "../../context/EntitlementsContext";
import type { SubscriptionState } from "../../lib/subscription";

const BILLING_EXEMPT = ["/billing", "/change-password"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);

  // Close sidebar on navigation change (for mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Trial enforcement: expired workspaces land on billing (hard block).
  useEffect(() => {
    if (loading || !user || !user.companyId) return;
    if (BILLING_EXEMPT.some((p) => pathname.startsWith(p))) return;
    let cancelled = false;
    fetch("/api/subscription/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SubscriptionState | null) => {
        if (cancelled || !data) return;
        setSubscription(data);
        if (data.status === "expired") {
          router.push("/billing");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, user?.companyId, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Loading workspace" />
      </div>
    );
  }

  const showTrialBanner =
    subscription?.status === "trial" &&
    subscription.daysLeft !== null &&
    subscription.daysLeft <= 7;

  return (
    <EntitlementsProvider
      plan={subscription?.plan ?? null}
      features={subscription?.features}
      known={!!subscription}
    >
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          {showTrialBanner && (
            <div className="shrink-0 border-b border-border bg-card px-4 py-2 text-[13px] text-muted-foreground md:px-6" role="status">
              {subscription.daysLeft === 1 ? (
                <>Your free trial ends tomorrow. </>
              ) : (
                <>{subscription.daysLeft} days left in your free trial. </>
              )}
              <Link href="/billing" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                View plans
              </Link>
            </div>
          )}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 ledger-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </EntitlementsProvider>
  );
}
