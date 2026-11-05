"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { EntitlementsProvider } from "../../context/EntitlementsContext";
import { DashboardShellSkeleton } from "../../components/ui/Skeleton";
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
  const lastSubscriptionFetchRef = useRef<number>(0);

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
  // Caches subscription check for 3 minutes to avoid blocking rapid page navigation with repeat network requests.
  useEffect(() => {
    if (loading || !user || !user.companyId) return;

    if (subscription?.status === "expired" && !BILLING_EXEMPT.some((p) => pathname.startsWith(p))) {
      router.push("/billing");
      return;
    }

    const now = Date.now();
    if (now - lastSubscriptionFetchRef.current < 180000 && subscription !== null) {
      return;
    }

    if (BILLING_EXEMPT.some((p) => pathname.startsWith(p))) return;
    let cancelled = false;
    lastSubscriptionFetchRef.current = now;

    fetch("/api/subscription/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SubscriptionState | null) => {
        if (cancelled || !data) return;
        setSubscription(data);
        if (data.status === "expired" && !BILLING_EXEMPT.some((p) => pathname.startsWith(p))) {
          router.push("/billing");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, user?.companyId, pathname, router, subscription]);

  if (loading || !user) {
    return <DashboardShellSkeleton />;
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
            <div className="mx-auto w-full max-w-[1280px] px-3.5 py-4 sm:px-6 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </EntitlementsProvider>
  );
}
