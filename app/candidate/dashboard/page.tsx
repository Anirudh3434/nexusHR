"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Briefcase, FileText, ClipboardList, ArrowRight, SearchX, PartyPopper, Clock, ListChecks,
} from "lucide-react";

const statusMeta: Record<string, { label: string; classes: string }> = {
  new: { label: "New", classes: "bg-gray-100 text-gray-700 border-gray-200" },
  under_review: { label: "Under Review", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  considered: { label: "Considered", classes: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  shortlisted: { label: "Shortlisted", classes: "bg-purple-100 text-purple-700 border-purple-200" },
  interview: { label: "Interview", classes: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  hired: { label: "Hired", classes: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", classes: "bg-red-100 text-red-700 border-red-200" },
  spam: { label: "Spam", classes: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || !user?.companyId) {
      if (user && !user.companyId) setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [appRes, onbRes] = await Promise.all([
          fetch(`/api/job-applications?companyId=${user.companyId}&email=${encodeURIComponent(user.email)}`),
          fetch("/api/onboarding"),
        ]);
        const appData = await appRes.json();
        const onbData = await onbRes.json();
        setApplications(appData.applications || []);
        setOnboarding(onbData.onboarding || []);
      } catch (error) {
        console.error("Failed to load candidate dashboard:", error);
        addToast({ type: "error", title: "Error", description: "Failed to load your dashboard" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.email, user?.companyId]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div></div>;
  }

  const latest = applications.sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime())[0];
  const meta = latest ? (statusMeta[latest.status] || statusMeta.new) : null;
  const isHired = latest?.status === 'hired';
  const rounds = latest?.interviewRounds || [];
  const clearedRounds = rounds.filter((r: any) => r.result === 'cleared').length;
  const onboardingRecord = onboarding[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Welcome header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {user?.name?.split(' ')[0] || 'Candidate'}!
        </h1>
        <p className="mt-1 text-sm text-indigo-100">
          Track your application status, interview rounds, offer letter and onboarding — all in one place.
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/candidate/my-application">
          <Card className="transition-all hover:shadow-lg hover:border-indigo-300 cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <FileText size={22} />
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">My Application</h3>
              <p className="mt-1 text-sm text-gray-500">Application status, interview rounds and offer letter.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/candidate/my-onboarding">
          <Card className="transition-all hover:shadow-lg hover:border-green-300 cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <ClipboardList size={22} />
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">My Onboarding</h3>
              <p className="mt-1 text-sm text-gray-500">Offer acceptance, document uploads and checklist tasks.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Application status summary */}
      {latest ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Briefcase size={22} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{latest.appliedPosition || 'Application'}</p>
                  <p className="text-sm text-gray-500">
                    {latest.jobId ? `${latest.jobId} · ` : ''}Applied{" "}
                    {latest.receivedAt ? new Date(latest.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>
              {meta && <Badge className={meta.classes}>{meta.label}</Badge>}
            </div>

            {/* Progress */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Application progress</span>
                <span>
                  {rounds.length > 0
                    ? `${clearedRounds} of ${rounds.length} rounds cleared`
                    : isHired ? 'Offer ready' : 'Awaiting review'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: isHired ? '100%' : rounds.length > 0 ? `${Math.max(15, (clearedRounds / Math.max(rounds.length, 1)) * 85)}%` : '10%',
                    backgroundColor: isHired ? '#16a34a' : '#4f46e5',
                  }}
                />
              </div>
            </div>

            {/* Round count */}
            {rounds.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <ListChecks size={16} className="text-indigo-500" />
                <span>{rounds.length} interview round{rounds.length === 1 ? '' : 's'}</span>
                {latest.interviewRounds?.some((r: any) => r.scheduledDate) && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={13} />
                    {new Date(latest.interviewRounds.filter((r: any) => r.scheduledDate).map((r: any) => r.scheduledDate).sort()[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            )}

            {isHired && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-1.5 font-semibold text-green-800">
                  <PartyPopper size={16} /> Congratulations! You&apos;re hired.
                </p>
                {onboardingRecord && (
                  <Link href="/candidate/my-onboarding">
                    <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
                      Continue Onboarding <ArrowRight size={16} />
                    </Button>
                  </Link>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/candidate/my-application">
                <Button variant="outline" className="gap-2">View full application <ArrowRight size={16} /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <SearchX className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No applications found for your account yet.</p>
            <p className="mt-1 text-sm text-gray-400">Once HR considers your application, your status will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
