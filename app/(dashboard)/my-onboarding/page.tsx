"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserRoundPlus, ClipboardList, FolderOpen, FileText, ArrowRight } from "lucide-react";

const statusMeta: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-gray-100 text-gray-700 border-gray-200" },
  offer_sent: { label: "Offer Sent", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  offer_accepted: { label: "Offer Accepted", classes: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  in_progress: { label: "In Progress", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200" },
  offer_declined: { label: "Offer Declined", classes: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/onboarding");
      const data = await response.json();
      setRecords(data.onboarding || []);
    } catch (error) {
      console.error("Failed to fetch onboarding:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load onboarding" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Onboarding</h1>
        <p className="text-sm text-gray-500">Complete your onboarding: accept the offer, upload documents and finish your tasks.</p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserRoundPlus className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No onboarding record assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        records.map((r) => {
          const meta = statusMeta[r.status] || statusMeta.draft;
          const totalTasks = (r.checklist || []).length;
          const doneTasks = (r.checklist || []).filter((t: any) => t.status === 'completed').length;
          const pendingDocs = (r.documents || []).filter((d: any) => d.status === 'pending' || d.status === 'rejected').length;
          const myTasks = (r.checklist || []).filter((t: any) => t.category === 'Employee' && t.status !== 'completed').length;

          return (
            <Card key={r._id}>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><UserRoundPlus size={22} /></div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.candidate.position || 'New Joiner'}</p>
                      <p className="text-sm text-gray-500">
                        Joining {r.candidate.joiningDate ? new Date(r.candidate.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                      </p>
                    </div>
                  </div>
                  <Badge className={meta.classes}>{meta.label}</Badge>
                </div>

                {/* Progress */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Onboarding progress</span>
                    <span>{r.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${r.progress}%` }} />
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800"><ClipboardList size={16} className="text-blue-500" />{doneTasks}/{totalTasks}</p>
                    <p className="text-xs text-gray-500">Tasks done</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800"><FolderOpen size={16} className="text-yellow-500" />{pendingDocs}</p>
                    <p className="text-xs text-gray-500">Docs pending</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800"><FileText size={16} className="text-purple-500" />{r.offerLetter?.status || 'draft'}</p>
                    <p className="text-xs text-gray-500">Offer status</p>
                  </div>
                </div>

                {myTasks > 0 && (
                  <p className="rounded-md bg-blue-50 p-2 text-sm text-blue-700">You have {myTasks} task{myTasks === 1 ? '' : 's'} waiting on you in the checklist.</p>
                )}

                <div className="flex justify-end">
                  <Link href={`/onboarding/${r._id}`}>
                    <Button className="gap-2">Open Onboarding <ArrowRight size={16} /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
