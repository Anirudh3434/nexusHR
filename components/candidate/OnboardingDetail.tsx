"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft, LayoutDashboard, FileText, ClipboardList, FolderOpen,
  Send, CheckCircle2, XCircle, Pencil, Trash2, Upload,
  Eye, Plus, RefreshCw
} from "lucide-react";

const statusMeta: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-gray-100 text-gray-700 border-gray-200" },
  offer_sent: { label: "Offer Sent", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  offer_accepted: { label: "Offer Accepted", classes: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  in_progress: { label: "In Progress", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200" },
  offer_declined: { label: "Offer Declined", classes: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 border-gray-200" },
};

const docCategoryLabels: Record<string, string> = {
  identity: "Identity", bank: "Bank", education: "Education", employment: "Employment", photo: "Photo", other: "Other",
};

const taskStatusMeta: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-gray-100 text-gray-600 border-gray-200" },
  in_progress: { label: "In Progress", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-400 border-gray-200" },
};

const docStatusMeta: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "Submitted", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  verified: { label: "Verified", classes: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", classes: "bg-red-100 text-red-700 border-red-200" },
};

interface Task {
  _id: string; title: string; description?: string; category: string; assigneeRole: string;
  dueDate?: string; status: string; notes?: string; completedBy?: { name: string }; completedAt?: string;
}
interface Doc {
  _id: string; title: string; category: string; isRequired: boolean; status: string;
  fileUrl?: string; fileName?: string; remarks?: string; verifiedBy?: { name: string }; verifiedAt?: string;
}

type Tab = 'overview' | 'offer' | 'checklist' | 'documents';

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const isStaff = user?.role === "admin" || user?.role === "hr" || (user?.role as string) === "super_admin";
  const isCandidate = !!user?.isCandidate;
  const backHref = isCandidate ? "/candidate/my-onboarding" : "/onboarding";

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);

  // Edit candidate form
  const [editCandidate, setEditCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState<any>({});
  const [notes, setNotes] = useState("");

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", category: "HR", assigneeRole: "hr", dueDate: "" });

  // Doc form
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", category: "identity", isRequired: true });

  // Offer response
  const [offerNotes, setOfferNotes] = useState("");

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/onboarding/${id}`);
      if (response.status === 403 || response.status === 401) {
        setForbidden(true);
        return;
      }
      const data = await response.json();
      setRecord(data.onboarding);
      setNotes(data.onboarding?.notes || "");
      setCandidateForm(data.onboarding?.candidate || {});
    } catch (error) {
      console.error("Failed to fetch onboarding:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load onboarding record" });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  const refresh = async (data?: any) => {
    if (data?.onboarding) {
      setRecord(data.onboarding);
      setNotes(data.onboarding.notes || "");
    } else {
      await fetchRecord();
    }
  };

  const meta = record ? (statusMeta[record.status] || statusMeta.draft) : statusMeta.draft;
  const canManage = isStaff;
  const canRespond = user?.role === "employee" && record?.offerLetter?.status === "sent";

  // ---------- Candidate / record actions ----------
  const saveCandidate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: candidateForm, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");
      await refresh(data);
      setEditCandidate(false);
      addToast({ type: "success", title: "Saved", description: "Onboarding updated" });
    } catch (e: any) {
      addToast({ type: "error", title: "Error", description: e.message });
    } finally { setSaving(false); }
  };

  const cancelRecord = async () => {
    if (!confirm("Cancel this onboarding? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancel: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel");
      await refresh(data);
      addToast({ type: "success", title: "Cancelled", description: "Onboarding cancelled" });
    } catch (e: any) {
      addToast({ type: "error", title: "Error", description: e.message });
    }
  };

  const deleteRecord = async () => {
    if (!confirm("Delete this draft onboarding permanently?")) return;
    try {
      const res = await fetch(`/api/onboarding/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      addToast({ type: "success", title: "Deleted", description: "Onboarding deleted" });
      router.push(backHref);
    } catch (e: any) {
      addToast({ type: "error", title: "Error", description: e.message });
    }
  };

  // ---------- Offer letter ----------
  const generateOffer = async () => {
    if (!record.offerLetter.ctc) {
      addToast({ type: "error", title: "CTC required", description: "Set the annual CTC to generate the offer letter." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/offer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctc: record.offerLetter.ctc, probationMonths: record.offerLetter.probationMonths }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate offer");
      await refresh(data);
      addToast({ type: "success", title: "Generated", description: "Offer letter generated" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const sendOffer = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/offer`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send offer");
      await refresh(data);
      addToast({ type: "success", title: "Sent", description: "Offer letter marked as sent" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const respondOffer = async (action: 'accept' | 'decline') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/offer`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseNotes: offerNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to respond");
      await refresh(data);
      setOfferNotes("");
      addToast({ type: "success", title: action === "accept" ? "Offer accepted" : "Offer declined", description: "Your response has been recorded" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  // ---------- Checklist ----------
  const addTask = async () => {
    if (!taskForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/checklist`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add task");
      await refresh(data);
      setShowAddTask(false);
      setTaskForm({ title: "", description: "", category: "HR", assigneeRole: "hr", dueDate: "" });
      addToast({ type: "success", title: "Added", description: "Task added to checklist" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const updateTask = async (task: Task, updates: Partial<Task>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/checklist`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task._id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update task");
      await refresh(data);
      addToast({ type: "success", title: "Updated", description: "Task updated" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Remove this task?")) return;
    try {
      const res = await fetch(`/api/onboarding/${id}/checklist?taskId=${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove task");
      await refresh(data);
      addToast({ type: "success", title: "Removed", description: "Task removed" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
  };

  // ---------- Documents ----------
  const addDoc = async () => {
    if (!docForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/documents`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(docForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add document");
      await refresh(data);
      setShowAddDoc(false);
      setDocForm({ title: "", category: "identity", isRequired: true });
      addToast({ type: "success", title: "Added", description: "Document requirement added" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const uploadDoc = async (doc: Doc, file: File) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `hrm/onboarding/${id}`);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.message || "Upload failed");
      const res = await fetch(`/api/onboarding/${id}/documents`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc._id, action: "upload", fileUrl: upData.secure_url, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save document");
      await refresh(data);
      addToast({ type: "success", title: "Uploaded", description: "Document submitted" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
    finally { setSaving(false); }
  };

  const verifyDoc = async (doc: Doc, action: 'verify' | 'reject') => {
    const remarks = action === 'reject' ? (prompt("Reason for rejection:") || "") : "";
    try {
      const res = await fetch(`/api/onboarding/${id}/documents`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc._id, action, remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update document");
      await refresh(data);
      addToast({ type: "success", title: "Updated", description: `Document ${action === 'verify' ? 'verified' : 'rejected'}` });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
  };

  const deleteDoc = async (documentId: string) => {
    if (!confirm("Remove this document requirement?")) return;
    try {
      const res = await fetch(`/api/onboarding/${id}/documents?documentId=${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove document");
      await refresh(data);
      addToast({ type: "success", title: "Removed", description: "Document requirement removed" });
    } catch (e: any) { addToast({ type: "error", title: "Error", description: e.message }); }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>;
  }

  if (forbidden || !record) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-gray-600">{forbidden ? "You don't have access to this onboarding record." : "Onboarding record not found."}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(backHref)}>Back</Button>
      </div>
    );
  }

  const groupedTasks = (['HR', 'IT', 'Admin', 'Manager', 'Employee'] as const).map((cat) => ({
    category: cat,
    tasks: (record.checklist || []).filter((t: Task) => t.category === cat),
  }));

  const canEditTask = (task: Task) => {
    if (canManage) return true;
    if (user?.role === "employee") return task.assigneeRole === "employee";
    return false;
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { key: 'offer', label: 'Offer Letter', icon: <FileText size={16} /> },
    { key: 'checklist', label: 'Checklist', icon: <ClipboardList size={16} />, count: (record.checklist || []).length },
    { key: 'documents', label: 'Documents', icon: <FolderOpen size={16} />, count: (record.documents || []).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft size={16} /></Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{record.candidate.fullName}</h1>
              <Badge className={meta.classes}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {record.candidate.position || 'Position TBD'}{record.candidate.department && ` · ${record.candidate.department}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 w-32">
            <div className="mb-1 flex justify-between text-xs text-gray-500"><span>Progress</span><span>{record.progress}%</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${record.progress}%` }} />
            </div>
          </div>
          {canManage && record.status === 'draft' && (
            <>
              <Button variant="outline" onClick={deleteRecord}><Trash2 size={14} className="mr-1" /> Delete</Button>
              <Button variant="outline" onClick={cancelRecord}><XCircle size={14} className="mr-1" /> Cancel</Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t.icon} {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 text-xs ${tab === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ---------- OVERVIEW ---------- */}
      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Candidate Information</CardTitle>
              {canManage && !editCandidate && (
                <Button variant="outline" size="sm" onClick={() => setEditCandidate(true)}><Pencil size={14} className="mr-1" /> Edit</Button>
              )}
            </CardHeader>
            <CardContent>
              {editCandidate && canManage ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ['fullName', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['position', 'Position'],
                      ['department', 'Department'], ['reportingManager', 'Reporting Manager'], ['workLocation', 'Work Location'],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <Input value={candidateForm[key] || ''} onChange={(e) => setCandidateForm((p: any) => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Joining Date</label>
                      <Input type="date" value={candidateForm.joiningDate ? new Date(candidateForm.joiningDate).toISOString().split('T')[0] : ''} onChange={(e) => setCandidateForm((p: any) => ({ ...p, joiningDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <textarea className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveCandidate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    <Button variant="outline" onClick={() => { setEditCandidate(false); setNotes(record.notes || ""); setCandidateForm(record.candidate); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Full Name', record.candidate.fullName], ['Email', record.candidate.email], ['Phone', record.candidate.phone || '—'],
                    ['Position', record.candidate.position || '—'], ['Department', record.candidate.department || '—'],
                    ['Reporting Manager', record.candidate.reportingManager || '—'], ['Employment Type', record.candidate.employmentType],
                    ['Work Location', record.candidate.workLocation || '—'],
                    ['Joining Date', record.candidate.joiningDate ? new Date(record.candidate.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-medium text-gray-800">{value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-gray-500">Account</p>
                    <p className="font-medium text-gray-800">
                      {record.employeeId ? (record.employeeId.name ? record.employeeId.name : 'Linked') : 'Not created'}
                      {record.employeeId?.isActive === false && <span className="text-red-500"> · Inactive</span>}
                    </p>
                  </div>
                </div>
              )}
              {record.notes && !editCandidate && (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Notes</p>
                  <p className="text-sm text-gray-700">{record.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
            <CardContent className="max-h-[28rem] space-y-3 overflow-y-auto">
              {(record.activity || []).slice().reverse().map((a: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm text-gray-800">{a.details || a.action}</p>
                    <p className="text-xs text-gray-400">{a.userName} · {new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {(record.activity || []).length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------- OFFER LETTER ---------- */}
      {tab === 'offer' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardHeader><CardTitle className="text-base">Offer Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Annual CTC</label>
                  <Input
                    value={record.offerLetter.ctc}
                    disabled={!canManage}
                    onChange={(e) => setRecord((p: any) => ({ ...p, offerLetter: { ...p.offerLetter, ctc: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Probation (months)</label>
                  <Input
                    type="number" min={0} value={record.offerLetter.probationMonths}
                    disabled={!canManage}
                    onChange={(e) => setRecord((p: any) => ({ ...p, offerLetter: { ...p.offerLetter, probationMonths: Number(e.target.value) } }))}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge className={statusMeta[record.offerLetter.status === 'accepted' ? 'offer_accepted' : record.offerLetter.status === 'declined' ? 'offer_declined' : record.offerLetter.status === 'sent' ? 'offer_sent' : 'draft']?.classes}>
                    {record.offerLetter.status}
                  </Badge>
                </div>

                {canManage && (
                  <div className="space-y-2">
                    {!record.offerLetter.content ? (
                      <Button className="w-full" onClick={generateOffer} disabled={saving}><FileText size={16} className="mr-2" /> Generate Offer Letter</Button>
                    ) : (
                      <Button className="w-full" variant="outline" onClick={generateOffer} disabled={saving}><RefreshCw size={16} className="mr-2" /> Regenerate</Button>
                    )}
                    {record.offerLetter.content && (record.offerLetter.status === 'draft' || record.offerLetter.status === 'sent') && (
                      <Button className="w-full" onClick={sendOffer} disabled={saving}><Send size={16} className="mr-2" /> Mark as Sent</Button>
                    )}
                  </div>
                )}

                {canRespond && (
                  <div className="space-y-2">
                    <textarea className="w-full rounded-md border border-gray-300 p-3 text-sm" rows={2} placeholder="Optional note with your response" value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} />
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => respondOffer('accept')} disabled={saving}><CheckCircle2 size={16} className="mr-1" /> Accept</Button>
                      <Button className="flex-1" variant="destructive" onClick={() => respondOffer('decline')} disabled={saving}><XCircle size={16} className="mr-1" /> Decline</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {record.offerLetter.generatedBy?.name && (
              <Card>
                <CardContent className="p-4 text-sm text-gray-500">
                  Generated by {record.offerLetter.generatedBy.name}
                  {record.offerLetter.generatedAt && <> · {new Date(record.offerLetter.generatedAt).toLocaleDateString('en-IN')}</>}
                  {record.offerLetter.sentAt && <> · Sent {new Date(record.offerLetter.sentAt).toLocaleDateString('en-IN')}</>}
                  {record.offerLetter.respondedAt && <> · Responded {new Date(record.offerLetter.respondedAt).toLocaleDateString('en-IN')}</>}
                  {record.offerLetter.responseNotes && <p className="mt-1 italic">{record.offerLetter.responseNotes}</p>}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Offer Letter Preview</CardTitle>
              {record.offerLetter.content && (
                <Button variant="outline" size="sm" onClick={() => window.print()}><Eye size={14} className="mr-1" /> Print</Button>
              )}
            </CardHeader>
            <CardContent>
              {record.offerLetter.content ? (
                <div className="rounded-md border border-gray-200">
                  <iframe title="Offer Letter" srcDoc={record.offerLetter.content} className="h-[36rem] w-full rounded-md" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <FileText className="mb-2 h-10 w-10" />
                  <p>No offer letter generated yet.</p>
                  {canManage && <p className="mt-1 text-sm">{'Set the CTC and click "Generate Offer Letter".'}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------- CHECKLIST ---------- */}
      {tab === 'checklist' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setShowAddTask((v) => !v)}><Plus size={16} className="mr-1" /> Add Task</Button>
            </div>
          )}
          {showAddTask && canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Add Checklist Task</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Title *</label>
                  <Input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Due Date</label>
                  <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={taskForm.category} onChange={(e) => setTaskForm((p) => ({ ...p, category: e.target.value }))}>
                    {['HR', 'IT', 'Admin', 'Manager', 'Employee'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Assignee</label>
                  <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={taskForm.assigneeRole} onChange={(e) => setTaskForm((p) => ({ ...p, assigneeRole: e.target.value }))}>
                    {[['hr', 'HR'], ['it', 'IT'], ['admin', 'Admin'], ['manager', 'Manager'], ['employee', 'Employee']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={addTask} disabled={saving}>Add Task</Button>
                  <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {groupedTasks.map(({ category, tasks }) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-sm font-normal text-gray-400">
                      {tasks.filter((t: Task) => t.status === 'completed').length}/{tasks.length} done
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasks.length === 0 && <p className="text-sm text-gray-400">No tasks.</p>}
                  {tasks.map((task: Task) => {
                    const tMeta = taskStatusMeta[task.status] || taskStatusMeta.pending;
                    return (
                      <div key={task._id} className="rounded-md border border-gray-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-800">{task.title}</p>
                              <Badge className={tMeta.classes}>{tMeta.label}</Badge>
                              <Badge variant="outline">{task.assigneeRole}</Badge>
                            </div>
                            {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
                            <p className="mt-1 text-xs text-gray-400">
                              {task.dueDate && <>Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                              {task.completedBy?.name && <> · Completed by {task.completedBy.name}</>}
                            </p>
                            {task.notes && <p className="mt-1 text-xs italic text-gray-500">Note: {task.notes}</p>}
                          </div>
                          {canEditTask(task) && (
                            <div className="flex shrink-0 gap-1">
                              {task.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => updateTask(task, { status: 'in_progress' })} disabled={saving}>Start</Button>
                                  <Button size="sm" variant="outline" onClick={() => updateTask(task, { status: 'completed' })} disabled={saving}><CheckCircle2 size={14} /></Button>
                                </>
                              )}
                              {task.status === 'in_progress' && (
                                <Button size="sm" variant="outline" onClick={() => updateTask(task, { status: 'completed' })} disabled={saving}><CheckCircle2 size={14} className="mr-1" /> Complete</Button>
                              )}
                              {task.status === 'completed' && canManage && (
                                <Button size="sm" variant="outline" onClick={() => updateTask(task, { status: 'pending' })} disabled={saving}><RefreshCw size={14} /></Button>
                              )}
                              {canManage && task.status === 'pending' && (
                                <Button size="sm" variant="ghost" onClick={() => deleteTask(task._id)} disabled={saving}><Trash2 size={14} className="text-red-500" /></Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ---------- DOCUMENTS ---------- */}
      {tab === 'documents' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setShowAddDoc((v) => !v)}><Plus size={16} className="mr-1" /> Add Document</Button>
            </div>
          )}
          {showAddDoc && canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Add Document Requirement</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Title *</label>
                  <Input value={docForm.title} onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={docForm.category} onChange={(e) => setDocForm((p) => ({ ...p, category: e.target.value }))}>
                    {Object.entries(docCategoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" checked={docForm.isRequired} onChange={(e) => setDocForm((p) => ({ ...p, isRequired: e.target.checked }))} className="h-4 w-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">Required document</span>
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={addDoc} disabled={saving}>Add</Button>
                  <Button variant="outline" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Documents</CardTitle>
              <CardDescription>New hire uploads documents; HR/Admin verifies them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(record.documents || []).length === 0 && <p className="text-sm text-gray-400">No document requirements yet.</p>}
              {(record.documents || []).map((doc: Doc) => {
                const dMeta = docStatusMeta[doc.status] || docStatusMeta.pending;
                return (
                  <div key={doc._id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-800">{doc.title}</p>
                          {doc.isRequired && <Badge variant="secondary">Required</Badge>}
                          <Badge variant="outline">{docCategoryLabels[doc.category] || doc.category}</Badge>
                          <Badge className={dMeta.classes}>{dMeta.label}</Badge>
                        </div>
                        {doc.status === 'submitted' && doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                            <Eye size={14} /> {doc.fileName || 'View document'}
                          </a>
                        )}
                        {doc.remarks && <p className="mt-1 text-xs text-red-500">Remarks: {doc.remarks}</p>}
                        {doc.verifiedBy?.name && (
                          <p className="mt-1 text-xs text-gray-400">Verified by {doc.verifiedBy.name}{doc.verifiedAt && ` · ${new Date(doc.verifiedAt).toLocaleDateString('en-IN')}`}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {/* Uploader: employee (own) or staff */}
                        {doc.status === 'pending' || doc.status === 'rejected' ? (
                          <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100">
                            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(doc, f); }} />
                            <Upload size={14} /> Upload
                          </label>
                        ) : null}
                        {/* Staff verify actions */}
                        {canManage && doc.status === 'submitted' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => verifyDoc(doc, 'verify')} disabled={saving}><CheckCircle2 size={14} className="mr-1" /> Verify</Button>
                            <Button size="sm" variant="ghost" onClick={() => verifyDoc(doc, 'reject')} disabled={saving}><XCircle size={14} className="text-red-500" /></Button>
                          </>
                        )}
                        {canManage && doc.status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => deleteDoc(doc._id)} disabled={saving}><Trash2 size={14} className="text-red-500" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
