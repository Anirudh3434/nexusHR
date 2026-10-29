"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { 
  Users, Search, Briefcase, Mail, Phone, FileText, 
  Clock, MapPin, Download, ThumbsUp, ThumbsDown, 
  Eye, X, Loader2, Filter, UserCheck, ExternalLink,
  Paperclip, Trash2, UserPlus2, PartyPopper, ListChecks, Send, KeyRound, CalendarDays
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";

interface InterviewRound {
  _id: string;
  name?: string;
  type?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: string;
  interviewer?: string;
  location?: string;
  meetingLink?: string;
  status?: string;
  result?: string;
  feedback?: string;
  decidedAt?: string;
  decidedBy?: { _id?: string; name?: string };
}

interface Applicant {
  _id: string;
  jobId?: string;
  appliedPosition: string;
  candidateName: string;
  fromEmail: string;
  candidatePhone?: string;
  experience?: string;
  currentDesignation?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  skills: string[];
  coverLetter?: string;
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    fileUrl: string;
  }>;
  status: 'new' | 'under_review' | 'considered' | 'rejected' | 'shortlisted' | 'interview' | 'hired';
  receivedAt: string;
  jobPositionId?: string;
  source: 'website' | 'email';
  interviewRounds?: InterviewRound[];
  portalAccessSentAt?: string;
  onboardingId?: string;
  rejectionReason?: string;
}

interface CredentialsResult {
  email: string;
  password: string | null;
  emailSent: boolean;
  emailError?: string;
  action: 'portal' | 'hire' | 'resend';
}

const ROUND_TYPES = ['telephonic', 'technical', 'managerial', 'hr', 'assignment', 'other'];

const roundResultBadge: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
  cleared: { label: 'Cleared', classes: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30' },
  failed: { label: 'Not Selected', classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30' },
  on_hold: { label: 'On Hold', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30' },
};

export default function ApplicantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [filterJobId, setFilterJobId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [showGeneral, setShowGeneral] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Hire flow state
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireForm, setHireForm] = useState({
    joiningDate: '',
    ctc: '',
    position: '',
    department: '',
    employmentType: 'Full-time',
  });
  const [hireLoading, setHireLoading] = useState(false);
  const [credentialsResult, setCredentialsResult] = useState<CredentialsResult | null>(null);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [newRound, setNewRound] = useState({ name: '', type: 'technical', scheduledDate: '', scheduledTime: '', duration: '', interviewer: '', location: '', meetingLink: '' });

  const openHireModal = (applicant: Applicant) => {
    setHireForm({
      joiningDate: '',
      ctc: '',
      position: applicant.appliedPosition || '',
      department: '',
      employmentType: 'Full-time',
    });
    setSelectedApplicant(applicant);
    setShowHireModal(true);
  };

  // Read jobId from URL query parameters on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobIdFromUrl = params.get('jobId');
    if (jobIdFromUrl) {
      setFilterJobId(jobIdFromUrl);
    }
  }, []);

  useEffect(() => {
    if (user?.companyId) {
      fetchApplicants();
    }
  }, [user?.companyId]);

  // Auto-sync emails every 2 minutes to catch new email applications
  useEffect(() => {
    if (!user?.companyId) return;

    const autoSyncInterval = setInterval(() => {
      console.log('Auto-syncing email applications...');
      // First sync emails from Gmail
      fetch('/api/email-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: user!.companyId }),
      }).then(async (response) => {
        const result = await response.json();
        setLastSyncAt(new Date());
        
        // Show token refresh notification
        if (result.tokenRefreshed) {
          addToast({ 
            type: "info", 
            title: "Token Refreshed", 
            description: "Gmail authentication was automatically renewed for seamless syncing." 
          });
        }
        
        // Then refresh applicants list
        fetchApplicants();
      }).catch(err => console.error('Auto-sync error:', err));
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(autoSyncInterval);
  }, [user?.companyId]);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      // Fetch applications with optional general inquiries filter
      const response = await fetch(`/api/applicants?companyId=${user!.companyId}&showGeneral=${showGeneral}`);
      const data = await response.json();
      setApplicants(data.applications || []);
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load applicants" });
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when toggle changes
  useEffect(() => {
    if (user?.companyId) {
      fetchApplicants();
    }
  }, [showGeneral]);

  const handleStatusUpdate = async (id: string, status: string, reason?: string) => {
    try {
      const response = await fetch('/api/applicants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, rejectionReason: reason }),
      });

      if (response.ok) {
        const result = await response.json();
        setApplicants(prev => prev.map(a => 
          a._id === id ? { ...a, status: status as any, portalAccessSentAt: result.portalAccessSentAt || a.portalAccessSentAt } : a
        ));
        if (selectedApplicant?._id === id) {
          setSelectedApplicant(prev => prev ? { ...prev, status: status as any, portalAccessSentAt: result.portalAccessSentAt || prev.portalAccessSentAt } : prev);
        }
        addToast({ type: "success", title: "Success", description: `Status updated to ${status}` });

        // Show the temporary password if portal access was granted just now
        if (result.portal?.password) {
          setCredentialsResult({
            email: result.fromEmail || '',
            password: result.portal.password,
            emailSent: result.portal.email?.ok === true,
            emailError: result.portal.email?.error,
            action: 'portal',
          });
        }
        // Show hire details if the applicant was hired just now
        if (result.hired) {
          setCredentialsResult({
            email: result.fromEmail || '',
            password: result.hired.password,
            emailSent: result.hired.email?.ok === true,
            emailError: result.hired.email?.error,
            action: 'hire',
          });
        }
      } else {
        addToast({ type: "error", title: "Error", description: "Failed to update status" });
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update status" });
    }
  };

  const handleHire = async (applicant: Applicant) => {
    setHireLoading(true);
    try {
      const response = await fetch('/api/applicants/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicant._id,
          action: 'hire',
          joiningDate: hireForm.joiningDate || null,
          ctc: hireForm.ctc,
          position: hireForm.position,
          department: hireForm.department,
          employmentType: hireForm.employmentType,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to hire candidate');
      }
      setShowHireModal(false);
      setSelectedApplicant(null);
      setCredentialsResult({
        email: result.application?.fromEmail || applicant.fromEmail,
        password: result.password,
        emailSent: result.email?.ok === true,
        emailError: result.email?.error,
        action: 'hire',
      });
      addToast({ type: "success", title: "Success", description: "Candidate hired successfully" });
      fetchApplicants();
    } catch (error: any) {
      addToast({ type: "error", title: "Error", description: error.message || "Failed to hire candidate" });
    } finally {
      setHireLoading(false);
    }
  };

  const handleResendCredentials = async (applicant: Applicant) => {
    try {
      const response = await fetch('/api/applicants/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: applicant._id, action: 'resend' }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend credentials');
      }
      setCredentialsResult({
        email: result.application?.fromEmail || applicant.fromEmail,
        password: result.password,
        emailSent: result.email?.ok === true,
        emailError: result.email?.error,
        action: 'resend',
      });
      addToast({ type: "success", title: "Success", description: "New credentials emailed to the candidate" });
    } catch (error: any) {
      addToast({ type: "error", title: "Error", description: error.message || "Failed to resend credentials" });
    }
  };

  const addRound = async (applicant: Applicant) => {
    if (!newRound.name.trim()) {
      addToast({ type: "error", title: "Error", description: "Round name is required" });
      return;
    }
    setRoundsLoading(true);
    try {
      const response = await fetch(`/api/job-applications/${applicant._id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRound.name.trim(),
          type: newRound.type,
          scheduledDate: newRound.scheduledDate || null,
          scheduledTime: newRound.scheduledTime || '',
          duration: newRound.duration || '',
          interviewer: newRound.interviewer || '',
          location: newRound.location || '',
          meetingLink: newRound.meetingLink || '',
        }),
      });
      if (!response.ok) throw new Error('Failed to add round');
      const result = await response.json();
      const round = result.round;
      const nextStatus = result.status;
      setApplicants(prev => prev.map(a =>
        a._id === applicant._id ? { ...a, status: nextStatus || a.status, interviewRounds: [...(a.interviewRounds || []), round] } : a
      ));
      setSelectedApplicant(prev => prev ? { ...prev, status: nextStatus || prev.status, interviewRounds: [...(prev.interviewRounds || []), round] } : prev);
      setNewRound({ name: '', type: 'technical', scheduledDate: '', scheduledTime: '', duration: '', interviewer: '', location: '', meetingLink: '' });
      addToast({ type: "success", title: "Success", description: "Interview round added" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to add round" });
    } finally {
      setRoundsLoading(false);
    }
  };

  const updateRound = async (applicant: Applicant, roundId: string, updates: any) => {
    try {
      const response = await fetch(`/api/job-applications/${applicant._id}/rounds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, ...updates }),
      });
      if (!response.ok) throw new Error('Failed to update round');
      const result = await response.json();
      const updatedRound = result.round;
      const nextStatus = result.status;
      setApplicants(prev => prev.map(a =>
        a._id === applicant._id
          ? { ...a, status: nextStatus || a.status, interviewRounds: (a.interviewRounds || []).map(r => r._id === roundId ? updatedRound : r) }
          : a
      ));
      setSelectedApplicant(prev => prev ? { ...prev, status: nextStatus || prev.status, interviewRounds: (prev.interviewRounds || []).map(r => r._id === roundId ? updatedRound : r) } : prev);
      addToast({ type: "success", title: "Success", description: "Round updated" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update round" });
    }
  };

  const handleConsider = (applicant: Applicant) => {
    handleStatusUpdate(applicant._id, 'considered');
  };

  const handleReject = (applicant: Applicant) => {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return;
    handleStatusUpdate(applicant._id, 'rejected', reason || undefined);
  };

  const handleDelete = async (applicant: Applicant) => {
    if (!confirm(`Are you sure you want to delete ${applicant.candidateName || 'this applicant'}?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/applicants?id=${applicant._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete applicant');
      }
      
      // Remove from local state
      setApplicants(prev => prev.filter(a => a._id !== applicant._id));
      
      // Close modal if open
      if (selectedApplicant?._id === applicant._id) {
        setSelectedApplicant(null);
      }
      
      addToast({
        type: "success",
        title: "Deleted",
        description: "Applicant has been removed successfully."
      });
    } catch (error) {
      console.error('Delete error:', error);
      addToast({
        type: "error",
        title: "Error",
        description: "Failed to delete applicant. Please try again."
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
      considered: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      shortlisted: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
      interview: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      hired: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'New',
      under_review: 'Under Review',
      considered: 'Considered',
      rejected: 'Rejected',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      hired: 'Hired',
    };
    return labels[status] || status;
  };

  const getSourceColor = (source: string) => {
    return source === 'website' 
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' 
      : 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300';
  };

  const getSourceLabel = (source: string) => {
    return source === 'website' ? 'Online' : 'Email';
  };

  // Get unique Job IDs for filter
  const uniqueJobIds = Array.from(new Set(applicants.map(a => a.jobId).filter(Boolean)));

  // Filter applicants
  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = 
      a.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.fromEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.appliedPosition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.jobId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesJobId = !filterJobId || a.jobId === filterJobId;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesSource = !filterSource || a.source === filterSource;
    
    return matchesSearch && matchesJobId && matchesStatus && matchesSource;
  });

  // Stats
  const stats = {
    total: applicants.length,
    new: applicants.filter(a => a.status === 'new').length,
    considered: applicants.filter(a => a.status === 'considered').length,
    rejected: applicants.filter(a => a.status === 'rejected').length,
    shortlisted: applicants.filter(a => a.status === 'shortlisted').length,
    interview: applicants.filter(a => a.status === 'interview').length,
    hired: applicants.filter(a => a.status === 'hired').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        icon={<Users />}
        title="Applicants"
        description="Review candidate applications, track pipeline stages, and manage hiring"
        actions={
          <div className="flex items-center gap-2">
            {lastSyncAt && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Last sync: {lastSyncAt.toLocaleTimeString()}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchApplicants} disabled={loading}>
              <Loader2 className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/job-positions')}>
              <Briefcase className="h-4 w-4 mr-1.5" />
              Job Positions
            </Button>
          </div>
        }
      />

      {/* Requisition Pipeline Callout */}
      <div className="flex items-start gap-3.5 rounded-[14px] border border-border bg-card p-4 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Briefcase className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Unified Requisition Pipeline
            </h4>
            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Omnichannel
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Consolidating all candidate submissions from web applications and inbound email streams indexed by Job Reference. Use the filters below to inspect source channels or individual position stages.
          </p>
        </div>
      </div>

      {/* Active Job ID Filter Banner */}
      {filterJobId && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between dark:bg-primary/10 dark:border-primary/25">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                Filtered by Job ID: <span className="font-mono bg-primary/10 px-2 py-1 rounded text-primary">{filterJobId}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Showing {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''} for this position
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setFilterJobId('');
              window.history.replaceState({}, '', window.location.pathname);
            }}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users },
          { label: 'New', value: stats.new, icon: UserCheck },
          { label: 'Interview', value: stats.interview, icon: CalendarDays },
          { label: 'Shortlisted', value: stats.shortlisted, icon: Briefcase },
          { label: 'Hired', value: stats.hired, icon: PartyPopper },
          { label: 'Rejected', value: stats.rejected, icon: ThumbsDown },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-[14px] border border-border bg-card shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-foreground font-display">{value}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, position, or Job ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm border-border bg-card"
          />
        </div>
        
        {uniqueJobIds.length > 0 && (
          <select
            className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
          >
            <option value="">All Job IDs</option>
            {uniqueJobIds.map(jobId => (
              <option key={jobId} value={jobId}>{jobId}</option>
            ))}
          </select>
        )}
        
        <select
          className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="under_review">Under Review</option>
          <option value="considered">Considered</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
          <option value="spam">Spam</option>
        </select>
        
        <select
          className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="website">Online (Careers Page)</option>
          <option value="email">Email</option>
        </select>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-10 shadow-xs">
          <input 
            type="checkbox" 
            id="showGeneral" 
            checked={showGeneral}
            onChange={(e) => setShowGeneral(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="showGeneral" className="text-sm font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none">
            Show General Inquiries
          </label>
        </div>
      </div>

      {/* Applicants Table */}
      <Card className="rounded-[14px] border border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {filteredApplicants.length === 0 ? (
            <EmptyState
              icon={<Users size={18} />}
              title="No applicants yet"
              description="Candidates submitting applications via the careers portal or emailing requisitions will appear here."
              action={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={fetchApplicants}>
                    <Loader2 className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => router.push('/job-positions')}>
                    <Briefcase className="h-4 w-4 mr-1.5" />
                    View Job Positions
                  </Button>
                </div>
              }
            />
          ) : (
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Job ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplicants.map((applicant) => (
                  <tr 
                    key={applicant._id}
                    className="hover:bg-muted/60 cursor-pointer"
                    onClick={() => setSelectedApplicant(applicant)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                          {applicant.candidateName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-slate-100">{applicant.candidateName || 'Unknown'}</p>
                            {applicant.hasAttachments && (
                              <span title="Has attachments">
                                <Paperclip className="h-3 w-3 text-primary" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{applicant.fromEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {applicant.jobId ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                          {applicant.jobId}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${getSourceColor(applicant.source)}`}>
                        {getSourceLabel(applicant.source)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-slate-100">{applicant.appliedPosition || 'N/A'}</p>
                      {applicant.currentDesignation && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">Current: {applicant.currentDesignation}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-slate-100">{applicant.experience || 'N/A'}</p>
                      {applicant.noticePeriod && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">Notice: {applicant.noticePeriod}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-xs ${getStatusColor(applicant.status)}`}>
                          {getStatusLabel(applicant.status)}
                        </Badge>
                        {applicant.portalAccessSentAt && (
                          <span title={`Portal credentials sent on ${new Date(applicant.portalAccessSentAt).toLocaleString()}`}>
                            <Mail className="h-3.5 w-3.5 text-primary" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                      {new Date(applicant.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {applicant.status !== 'hired' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            onClick={(e) => { e.stopPropagation(); openHireModal(applicant); }}
                            title="Hire & send portal access"
                          >
                            <UserPlus2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); handleConsider(applicant); }}
                          title="Consider"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleReject(applicant); }}
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => { e.stopPropagation(); setSelectedApplicant(applicant); }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleDelete(applicant); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Applicant Detail Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Applicant Details</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedApplicant(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-2xl font-bold text-primary">
                  {selectedApplicant.candidateName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{selectedApplicant.candidateName}</h3>
                  <p className="text-gray-600 dark:text-slate-400">{selectedApplicant.appliedPosition}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedApplicant.jobId && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono">
                        {selectedApplicant.jobId}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(selectedApplicant.status)}>
                      {getStatusLabel(selectedApplicant.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid md:grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{selectedApplicant.fromEmail}</span>
                </div>
                {selectedApplicant.candidatePhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedApplicant.candidatePhone}</span>
                  </div>
                )}
                {selectedApplicant.experience && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedApplicant.experience}</span>
                  </div>
                )}
                {selectedApplicant.noticePeriod && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Notice: {selectedApplicant.noticePeriod}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {selectedApplicant.skills && selectedApplicant.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 dark:text-slate-100">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplicant.coverLetter && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 dark:text-slate-100">Cover Letter</h4>
                  <div className="bg-muted/40 p-4 rounded-lg text-sm text-foreground/80 whitespace-pre-wrap">
                    {selectedApplicant.coverLetter}
                  </div>
                </div>
              )}

              {/* Resume / Attachments */}
              {selectedApplicant.hasAttachments && selectedApplicant.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 dark:text-slate-100">Resume & Attachments</h4>
                  <div className="space-y-2">
                    {selectedApplicant.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm flex-1 truncate">{att.filename}</span>
                        <span className="text-xs text-muted-foreground">({(att.size / 1024).toFixed(1)} KB)</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:bg-primary/10"
                          onClick={() => window.open(att.fileUrl, '_blank')}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:bg-primary/10"
                          onClick={() => window.open(att.fileUrl + '?download=true', '_blank')}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Portal access */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" />
                  {selectedApplicant.portalAccessSentAt ? (
                    <span>Portal credentials sent on {new Date(selectedApplicant.portalAccessSentAt).toLocaleString()}</span>
                  ) : (
                    <span>No portal account yet — consider or hire the candidate to email credentials.</span>
                  )}
                </div>
                {selectedApplicant.portalAccessSentAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => handleResendCredentials(selectedApplicant)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Reset & Resend
                  </Button>
                )}
              </div>

              {/* Onboarding link for hired candidates */}
              {selectedApplicant.status === 'hired' && selectedApplicant.onboardingId && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-500/10">
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
                    <PartyPopper className="h-4 w-4" />
                    <span>This candidate is hired and has an onboarding record.</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:text-green-300"
                    onClick={() => window.open(`/onboarding/${selectedApplicant.onboardingId}`, '_blank')}
                  >
                    <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                    View Onboarding
                  </Button>
                </div>
              )}

              {/* Interview rounds */}
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 font-medium text-gray-900 dark:text-slate-100">
                  <ListChecks className="h-4 w-4 text-primary" /> Interview Rounds
                </h4>
                {(selectedApplicant.interviewRounds || []).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No interview rounds added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedApplicant.interviewRounds || []).map((round, idx) => {
                      const rm = roundResultBadge[round.result || 'pending'] || roundResultBadge.pending;
                      return (
                        <div key={round._id} className="rounded-lg border border-border bg-muted/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                                {round.name || `Round ${idx + 1}`}
                                {round.type && <span className="ml-2 text-xs font-normal text-gray-500 capitalize dark:text-slate-400">{round.type}</span>}
                              </p>
                              <Badge className={`mt-1 text-xs ${rm.classes}`}>{rm.label}</Badge>
                              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                {round.scheduledDate && (
                                  <span className="flex items-center gap-1">
                                    <CalendarDays size={12} /> {new Date(round.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {round.scheduledTime && <span>at {round.scheduledTime}</span>}
                                  </span>
                                )}
                                {round.duration && <span>{round.duration}</span>}
                                {round.interviewer && <span>· {round.interviewer}</span>}
                                {round.location && <span>· {round.location}</span>}
                                {round.meetingLink && (
                                  <a href={round.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                    <ExternalLink size={12} /> Join
                                  </a>
                                )}
                                {round.decidedAt && (
                                  <span>Decided {new Date(round.decidedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                )}
                                {round.decidedBy?.name && <span>by {round.decidedBy.name}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(['cleared', 'failed', 'pending'] as const).map((res) => (
                                <button
                                  key={res}
                                  onClick={() => updateRound(selectedApplicant, round._id, { result: res })}
                                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    round.result === res
                                      ? res === 'cleared' ? 'bg-green-600 text-white' : res === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {roundResultBadge[res].label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {round.feedback && (
                            <p className="mt-1.5 text-sm text-gray-600 italic dark:text-slate-400">&ldquo;{round.feedback}&rdquo;</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <input
                              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                              placeholder="Add feedback..."
                              defaultValue={round.feedback || ''}
                              onBlur={(e) => {
                                if (e.target.value !== round.feedback) updateRound(selectedApplicant, round._id, { feedback: e.target.value });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add round */}
                <div className="mt-3 rounded-lg border border-dashed border-border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Add interview round</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Input
                      className="col-span-2 md:col-span-2"
                      placeholder="Round name (e.g., Technical)"
                      value={newRound.name}
                      onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                    />
                    <select
                      className="rounded-md border bg-white px-2 py-1.5 text-sm dark:bg-slate-900"
                      value={newRound.type}
                      onChange={(e) => setNewRound({ ...newRound, type: e.target.value })}
                    >
                      {ROUND_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                    <Input
                      type="date"
                      value={newRound.scheduledDate}
                      onChange={(e) => setNewRound({ ...newRound, scheduledDate: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={newRound.scheduledTime}
                      onChange={(e) => setNewRound({ ...newRound, scheduledTime: e.target.value })}
                      placeholder="Time"
                    />
                    <Input
                      value={newRound.duration}
                      onChange={(e) => setNewRound({ ...newRound, duration: e.target.value })}
                      placeholder="Duration (e.g., 45 mins)"
                    />
                    <Input
                      value={newRound.interviewer}
                      onChange={(e) => setNewRound({ ...newRound, interviewer: e.target.value })}
                      placeholder="Interviewer"
                    />
                    <Input
                      value={newRound.location}
                      onChange={(e) => setNewRound({ ...newRound, location: e.target.value })}
                      placeholder="Location / Mode"
                    />
                    <Input
                      className="col-span-2"
                      value={newRound.meetingLink}
                      onChange={(e) => setNewRound({ ...newRound, meetingLink: e.target.value })}
                      placeholder="Meeting link (optional)"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={roundsLoading || !newRound.name.trim()}
                    onClick={() => addRound(selectedApplicant)}
                  >
                    <UserPlus2 className="h-3.5 w-3.5 mr-1.5" /> Add Round
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedApplicant.status !== 'hired' && (
                  <Button 
                    className="flex-1"
                    onClick={() => { openHireModal(selectedApplicant); }}
                  >
                    <UserPlus2 className="h-4 w-4 mr-2" />
                    Hire & Send Access
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => { handleConsider(selectedApplicant); setSelectedApplicant(null); }}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Consider
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30"
                  onClick={() => { handleReject(selectedApplicant); setSelectedApplicant(null); }}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30"
                  onClick={() => { handleDelete(selectedApplicant); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hire Modal */}
      {showHireModal && selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-primary" />
                  Hire {selectedApplicant.candidateName || 'Candidate'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowHireModal(false)} disabled={hireLoading}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground dark:bg-primary/10">
                This will mark the applicant as <strong>Hired</strong>, create their temporary portal account,
                generate an onboarding record + draft offer letter, and email their login credentials.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Joining Date</label>
                  <Input
                    type="date"
                    value={hireForm.joiningDate}
                    onChange={(e) => setHireForm({ ...hireForm, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Employment Type</label>
                  <select
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900"
                    value={hireForm.employmentType}
                    onChange={(e) => setHireForm({ ...hireForm, employmentType: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Position</label>
                  <Input
                    placeholder="Position / designation"
                    value={hireForm.position}
                    onChange={(e) => setHireForm({ ...hireForm, position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Department</label>
                  <Input
                    placeholder="Department"
                    value={hireForm.department}
                    onChange={(e) => setHireForm({ ...hireForm, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Annual CTC</label>
                  <Input
                    placeholder="e.g. ₹12,00,000"
                    value={hireForm.ctc}
                    onChange={(e) => setHireForm({ ...hireForm, ctc: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  disabled={hireLoading}
                  onClick={() => handleHire(selectedApplicant)}
                >
                  {hireLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus2 className="h-4 w-4 mr-2" />}
                  Confirm Hire & Send Access
                </Button>
                <Button variant="outline" onClick={() => setShowHireModal(false)} disabled={hireLoading}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credentials Result Modal */}
      {credentialsResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  {credentialsResult.action === 'portal' ? 'Portal Access Granted' : credentialsResult.action === 'resend' ? 'Credentials Reset' : 'Candidate Hired'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCredentialsResult(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Share these credentials with <strong>{credentialsResult.email}</strong>. They log in at the company login page with their email + this password.
              </p>
              {credentialsResult.password ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase text-primary">Temporary Password</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(credentialsResult.password || '');
                          addToast({ type: "success", title: "Copied", description: "Password copied to clipboard" });
                        } catch {
                          addToast({ type: "error", title: "Error", description: "Could not copy password" });
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="mt-1 select-all font-mono text-lg font-semibold text-gray-900 dark:text-slate-100">{credentialsResult.password}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Save this now — it is only shown once.</p>
                </div>
              ) : (
                <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300">
                  The candidate already had an account, so no new password was generated.
                </p>
              )}
              <div className={`rounded-md p-3 text-sm ${credentialsResult.emailSent ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {credentialsResult.emailSent ? (
                  <>Email sent successfully to {credentialsResult.email}.</>
                ) : (
                  <>
                    Email could not be sent: {credentialsResult.emailError || 'Unknown error'}. Use the temporary password above to share access manually.
                  </>
                )}
              </div>
              <Button className="w-full" onClick={() => setCredentialsResult(null)}>
                Done
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
