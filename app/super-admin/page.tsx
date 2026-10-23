"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Building2, Users, Loader2,
  ArrowUpRight, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyDetail {
  id: string;
  name: string;
  code: string;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  onboardingComplete: boolean;
  registrationStep: number | null;
  createdAt: string;
  employeeCount: number;
  onboarding: { inProgress: number; completed: number; draft: number };
}

interface Overview {
  companies: { total: number; trial: number; active: number; expired: number };
  users: { total: number; byRole: { _id: string; count: number }[] };
  companyDetails: CompanyDetail[];
  recentUsers: any[];
}

const statusStyle = (s: string) =>
  s === "active"
    ? "bg-primary/10 text-primary"
    : s === "trial"
      ? "bg-muted text-foreground"
      : "bg-destructive/10 text-destructive";

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const ovRes = await fetch("/api/super-admin/overview");
      if (ovRes.ok) setOverview(await ovRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading platform overview" />
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <EmptyState icon={<Crown size={18} />} title="Platform overview unavailable" description="You may not have access. Super admins only." />
      </Card>
    );
  }

  const stats = [
    { label: "Workspaces", value: String(overview.companies.total), note: `${overview.companies.trial} trial · ${overview.companies.active} active · ${overview.companies.expired} expired`, icon: <Building2 size={15} className="text-muted-foreground" /> },
    { label: "Users", value: String(overview.users.total), note: overview.users.byRole.map((r) => `${r._id}: ${r.count}`).join(" · "), icon: <Users size={15} className="text-muted-foreground" /> },
  ];

  return (
    <div className="space-y-5">
      {user?.mustChangePassword && (
        <div className="rounded-[14px] border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground sm:px-5" role="status">
          You are using a temporary password.{" "}
          <Link href="/change-password" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
            Set your own password
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Crown size={13} />
            Platform administration
          </p>
          <h1 className="font-display mt-1 text-[26px] leading-tight font-medium tracking-tight text-foreground">
            Mission control.
          </h1>
        </div>
        <div className="flex gap-2 text-[13px]">
          {[
            { href: "/commands", label: "Company Mgmt" },
            { href: "/users", label: "User Mgmt" },
            { href: "/permissions", label: "Roles & Perms" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
              {l.label} <ArrowUpRight size={13} />
            </Link>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-1 divide-border rounded-[14px] border border-border bg-card sm:grid-cols-2 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="flex h-full flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[13px] text-muted-foreground">{s.label}</dt>
              {s.icon}
            </div>
            <div>
              <dd className="font-display tabular text-[26px] leading-none font-medium text-foreground">{s.value}</dd>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.note}</p>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-border bg-card p-5 lg:col-span-2" aria-label="Workspaces">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Workspaces</h2>
            <Link href="/commands" className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
              Manage <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[13px] text-muted-foreground">
                  <th className="py-2.5 pr-3 font-medium">Workspace</th>
                  <th className="py-2.5 pr-3 font-medium">Plan</th>
                  <th className="py-2.5 pr-3 font-medium">Onboarding</th>
                  <th className="py-2.5 pr-3 font-medium tabular">Employees</th>
                  <th className="py-2.5 pr-3 font-medium">Hiring pipeline</th>
                  <th className="py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {overview.companyDetails.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3">
                      <p className="text-[13px] font-semibold text-foreground">{c.name}</p>
                      <p className="tabular flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{c.code}</span>
                        <span aria-hidden>·</span>
                        <span className={cn(
                          "rounded px-1.5 py-px text-[11px] font-medium capitalize",
                          statusStyle(c.status)
                        )}>
                          {c.status}
                        </span>
                      </p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="text-[13px] font-medium text-foreground capitalize">{c.plan}</p>
                      {c.status === "trial" && c.trialEndsAt && (
                        <p className="tabular text-xs text-muted-foreground">
                          ends {new Date(c.trialEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {c.onboardingComplete ? (
                        <p className="text-[13px] font-medium text-primary">Complete</p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground">
                          Step {c.registrationStep ?? 1} of 4
                        </p>
                      )}
                    </td>
                    <td className="tabular py-2.5 pr-3 text-[13px] font-semibold text-foreground">
                      {c.employeeCount}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {c.onboarding.inProgress + c.onboarding.completed + c.onboarding.draft === 0 ? (
                        "No onboardings"
                      ) : (
                        <>{c.onboarding.inProgress} active · {c.onboarding.completed} done · {c.onboarding.draft} draft</>
                      )}
                    </td>
                    <td className="tabular py-2.5 text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {overview.companyDetails.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-[13px] text-muted-foreground">No workspaces yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[14px] border border-border bg-card p-5" aria-label="Recent users">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Recent users</h2>
            <Link href="/users" className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
              Manage <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border/60">
            {overview.recentUsers.map((u: any) => (
              <div key={u._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground capitalize">
                  {u.role}
                </span>
              </div>
            ))}
            {overview.recentUsers.length === 0 && (
              <p className="py-4 text-[13px] text-muted-foreground">No users yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
