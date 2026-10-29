"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { UserPlus2, Search, Users, ClipboardCheck, CheckCircle2, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageHeader } from "../../../components/ui/PageHeader";

interface OnboardingRecord {
  _id: string;
  employeeId?: { _id: string; name: string; email: string; role: string; isActive: boolean } | null;
  candidate: {
    fullName: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    joiningDate: string;
    employmentType: string;
  };
  offerLetter: { status: string };
  status: string;
  progress: number;
  createdAt: string;
}

const statusMeta: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  offer_sent: { label: "Offer Sent", classes: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30" },
  offer_accepted: { label: "Offer Accepted", classes: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30" },
  in_progress: { label: "In Progress", classes: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30" },
  offer_declined: { label: "Offer Declined", classes: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30" },
  cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isStaff = user?.role === "admin" || user?.role === "hr" || (user?.role as string) === "super_admin";

  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append("companyId", user.companyId);
      if (filterStatus) params.append("status", filterStatus);
      const response = await fetch(`/api/onboarding?${params.toString()}`);
      const data = await response.json();
      setRecords(data.onboarding || []);
    } catch (error) {
      console.error("Failed to fetch onboarding records:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load onboarding records" });
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, filterStatus, addToast]);

  useEffect(() => {
    if (user?.companyId) {
      fetchRecords();
    }
  }, [user?.companyId, fetchRecords]);

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.candidate.fullName.toLowerCase().includes(q) ||
      r.candidate.email.toLowerCase().includes(q) ||
      r.candidate.position.toLowerCase().includes(q) ||
      r.candidate.department.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: records.length,
    inProgress: records.filter((r) => r.status === "in_progress" || r.status === "offer_accepted" || r.status === "offer_sent").length,
    completed: records.filter((r) => r.status === "completed").length,
    declined: records.filter((r) => r.status === "offer_declined" || r.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<UserPlus2 />}
        title="Employee Onboarding"
        description="Manage offer letters, document collection and onboarding tasks for new hires."
        actions={
          isStaff ? (
            <Link href="/onboarding/new">
              <Button className="gap-2">
                <UserPlus2 size={16} /> Start Onboarding
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20"><Users size={22} /></div>
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-gray-500 dark:text-slate-400">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400"><TrendingUp size={22} /></div>
            <div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-slate-400">Active</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"><CheckCircle2 size={22} /></div>
            <div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-sm text-gray-500 dark:text-slate-400">Completed</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"><ClipboardCheck size={22} /></div>
            <div><p className="text-2xl font-bold">{stats.declined}</p><p className="text-sm text-gray-500 dark:text-slate-400">Declined / Cancelled</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, position or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <CustomSelect
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="All statuses"
          ariaLabel="Filter onboarding records by status"
          className="w-full shrink-0 sm:w-52"
          buttonClassName="h-10"
          options={[
            { value: "", label: "All statuses" },
            ...Object.entries(statusMeta).map(([value, meta]) => ({
              value,
              label: meta.label,
            })),
          ]}
        />
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={18} />}
              title="No onboarding records found."
              description={
                records.length === 0 && !searchQuery && !filterStatus
                  ? "Onboarding starts once a candidate accepts an offer. You can also start one manually."
                  : "No records match your current search or status filter."
              }
              action={isStaff ? (
                <Link
                  href="/onboarding/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <UserPlus2 className="h-3.5 w-3.5" />
                  Start a new onboarding
                </Link>
              ) : undefined}
            />
          ) : (
            filtered.map((r) => {
              const meta = statusMeta[r.status] || statusMeta.draft;
              return (
                <Link
                  key={r._id}
                  href={`/onboarding/${r._id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-slate-700"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-gray-900 dark:text-slate-100">{r.candidate.fullName}</p>
                        <Badge className={meta.classes}>{meta.label}</Badge>
                        {!r.employeeId?.isActive && r.employeeId && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-400">
                        {r.candidate.position || 'Position TBD'}
                        {r.candidate.department && ` · ${r.candidate.department}`}
                        {r.candidate.email && ` · ${r.candidate.email}`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Joining: {r.candidate.joiningDate ? new Date(r.candidate.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <div className="w-32">
                        <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{r.progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
