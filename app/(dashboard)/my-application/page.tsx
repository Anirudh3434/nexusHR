"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Briefcase, ClipboardList, CheckCircle2, XCircle, Clock,
  CalendarDays, ArrowRight, SearchX, PartyPopper, ListChecks,
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

const roundResultMeta: Record<string, { label: string; classes: string; icon: any }> = {
  pending: { label: "Pending", classes: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock },
  cleared: { label: "Cleared", classes: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  failed: { label: "Not Selected", classes: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  on_hold: { label: "On Hold", classes: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
};

const roundTypeMeta: Record<string, string> = {
  telephonic: "Telephonic",
  technical: "Technical",
  managerial: "Managerial",
  hr: "HR",
  assignment: "Assignment",
  other: "Other",
};

function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyApplicationPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || !user?.companyId) {
      if (user && !user.companyId) setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/job-applications?companyId=${user.companyId}&email=${encodeURIComponent(user.email)}`
        );
        const data = await response.json();
        setApplications(data.applications || []);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
        addToast({ type: "error", title: "Error", description: "Failed to load your application" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.email, user?.companyId]);

  const sorted = useMemo(
    () => [...applications].sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime()),
    [applications]
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Application</h1>
        <p className="text-sm text-gray-500">Track your application status, interview rounds and offer.</p>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <SearchX className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No applications found for your account yet.</p>
            <p className="mt-1 text-sm text-gray-400">Once HR considers your application, your status will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        sorted.map((app) => {
          const meta = statusMeta[app.status] || statusMeta.new;
          const rounds = app.interviewRounds || [];
          const clearedRounds = rounds.filter((r: any) => r.result === 'cleared').length;
          const offer = app.offerLetter || {};
          const isHired = app.status === 'hired';

          return (
            <Card key={app._id}>
              <CardContent className="space-y-5 p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Briefcase size={22} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{app.appliedPosition || 'Application'}</p>
                      <p className="text-sm text-gray-500">
                        {app.jobId ? `${app.jobId} · ` : ''}Applied {formatDate(app.receivedAt) || formatDate(app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className={meta.classes}>{meta.label}</Badge>
                </div>

                {/* Pipeline progress */}
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
                        backgroundColor: isHired ? '#16a34a' : '#2563eb',
                      }}
                    />
                  </div>
                </div>

                {/* Interview rounds timeline */}
                {rounds.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                      <ListChecks size={15} className="text-blue-500" /> Interview Rounds
                    </p>
                    <div className="space-y-2">
                      {rounds.map((round: any, idx: number) => {
                        const rm = roundResultMeta[round.result] || roundResultMeta.pending;
                        const RIcon = rm.icon;
                        return (
                          <div key={round._id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600 shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-800">
                                  {round.name || `${roundTypeMeta[round.type] || 'Round'} ${idx + 1}`}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <RIcon size={13} className={round.result === 'cleared' ? 'text-green-600' : round.result === 'failed' ? 'text-red-600' : 'text-gray-400'} />
                                  <Badge className={rm.classes}>{rm.label}</Badge>
                                </div>
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                {round.type ? <span className="capitalize">{roundTypeMeta[round.type]}</span> : null}
                                {round.scheduledDate && (
                                  <>
                                    <span>·</span>
                                    <CalendarDays size={12} /> {formatDate(round.scheduledDate)}
                                  </>
                                )}
                                {round.decidedAt && (
                                  <>
                                    <span>·</span>
                                    <span>Decided {formatDate(round.decidedAt)}</span>
                                  </>
                                )}
                              </p>
                              {round.feedback && (
                                <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{round.feedback}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Offer / Onboarding section when hired */}
                {isHired && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-green-800">
                          <PartyPopper size={16} /> Congratulations! You&apos;re hired.
                        </p>
                        <p className="mt-0.5 text-sm text-green-700">
                          {offer.status && offer.status !== 'draft' ? `Offer status: ${offer.status}` : 'Your offer letter is being prepared by HR.'}
                          {offer.ctc ? ` · Annual CTC: ${offer.ctc}` : ''}
                        </p>
                      </div>
                      {app.onboardingId && (
                        <Link href="/my-onboarding">
                          <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
                            <ClipboardList size={16} /> Start Onboarding <ArrowRight size={16} />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {app.rejectionReason && (
                  <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">Reason: {app.rejectionReason}</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
