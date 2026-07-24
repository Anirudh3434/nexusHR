"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { 
  getJobApplications, 
  JobApplication, 
  ApplicationStats,
  markAsRead,
  toggleStarred,
  updateApplicationStatus,
  deleteJobApplication,
  getStatusColor,
  getStatusLabel,
  considerCandidate,
  rejectCandidate
} from "../../../services/jobApplicationService";
import { getEmailConfig, syncEmails } from "../../../services/emailConfigService";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { 
  Inbox, Star, Trash2, Mail, MailOpen, RefreshCw, 
  Search, Filter, UserCheck, Clock, CheckCircle, 
  XCircle, Briefcase, MoreVertical, Loader2,
  Send, Paperclip, ChevronLeft, Archive, ThumbsUp,
  ThumbsDown, Eye, Calendar, DollarSign, Briefcase as BriefcaseIcon,
  MapPin, FileText, User, Phone, X
} from "lucide-react";

const statusOptions = [
  { value: 'new', label: 'New', icon: Mail },
  { value: 'reviewing', label: 'Reviewing', icon: Clock },
  { value: 'shortlisted', label: 'Shortlisted', icon: Star },
  { value: 'interview', label: 'Interview', icon: UserCheck },
  { value: 'hired', label: 'Hired', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'spam', label: 'Spam', icon: Archive },
];

export default function RecruitmentInboxPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({ total: 0, new: 0, unread: 0, starred: 0, shortlisted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'unread' | 'starred' | 'shortlisted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) {
      fetchData();
      checkEmailConfig();
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (!user?.companyId || !hasEmailConfig) return;

    const autoSyncInterval = setInterval(() => {
      console.log('Auto-syncing emails...');
      handleSync();
      setLastSyncAt(new Date());
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(autoSyncInterval);
  }, [user?.companyId, hasEmailConfig]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      let params: any = { companyId: user!.companyId! };
      if (filter === 'unread') params.isRead = false;
      if (filter === 'starred') params.isStarred = true;
      if (filter === 'new') params.status = 'new';
      if (filter === 'shortlisted') params.status = 'shortlisted';
      
      const data = await getJobApplications(params);
      setApplications(data.applications);
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load applications" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailConfig = async () => {
    try {
      const config = await getEmailConfig(user!.companyId!);
      // Check both that config exists AND that it's connected (has access token)
      setHasEmailConfig(!!config && (config as any).connected === true);
    } catch (error) {
      setHasEmailConfig(false);
    }
  };

  const handleSync = async () => {
    if (!hasEmailConfig) {
      addToast({ type: "error", title: "Error", description: "Please configure email settings first" });
      return;
    }
    
    try {
      setIsSyncing(true);
      const result = await syncEmails(user!.companyId!);
      setLastSyncAt(new Date());
      
      // Show token refresh notification if token was automatically refreshed
      if (result.tokenRefreshed) {
        addToast({ 
          type: "info", 
          title: "Token Refreshed", 
          description: "Gmail authentication was automatically renewed for seamless syncing." 
        });
      }
      
      addToast({ 
        type: "success", 
        title: "Sync Complete", 
        description: result.new > 0 
          ? `Found ${result.new} new job applications!` 
          : "No new applications found." 
      });
      fetchData();
    } catch (error: any) {
      console.error("Sync error:", error);
      addToast({ 
        type: "error", 
        title: "Sync Failed", 
        description: error.message || "Failed to sync emails" 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearMockData = async () => {
    try {
      const response = await fetch(`/api/clear-mock-applications?companyId=${user!.companyId!}`);
      const result = await response.json();
      addToast({ 
        type: "success", 
        title: "Test Data Cleared", 
        description: `Removed ${result.deleted} test entries` 
      });
      fetchData();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to clear test data" });
    }
  };

  const handleSelect = async (app: JobApplication) => {
    setSelectedApp(app);
    if (!app.isRead) {
      try {
        await markAsRead(app._id);
        setApplications(prev => prev.map(a => 
          a._id === app._id ? { ...a, isRead: true } : a
        ));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const handleStar = async (e: React.MouseEvent, app: JobApplication) => {
    e.stopPropagation();
    try {
      await toggleStarred(app._id, !app.isStarred);
      setApplications(prev => prev.map(a => 
        a._id === app._id ? { ...a, isStarred: !app.isStarred } : a
      ));
      if (selectedApp?._id === app._id) {
        setSelectedApp({ ...selectedApp, isStarred: !app.isStarred });
      }
    } catch (error) {
      console.error("Failed to star:", error);
    }
  };

  const handleConsider = async (e: React.MouseEvent, app: JobApplication) => {
    e.stopPropagation();
    try {
      await considerCandidate(app._id);
      setApplications(prev => prev.map(a => 
        a._id === app._id ? { ...a, status: 'considered' } : a
      ));
      if (selectedApp?._id === app._id) {
        setSelectedApp({ ...selectedApp, status: 'considered' });
      }
      addToast({ type: "success", title: "Success", description: "Candidate marked as considered" });
    } catch (error) {
      console.error("Failed to consider:", error);
      addToast({ type: "error", title: "Error", description: "Failed to update status" });
    }
  };

  const handleReject = async (e: React.MouseEvent, app: JobApplication) => {
    e.stopPropagation();
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // User cancelled
    
    try {
      await rejectCandidate(app._id, reason || undefined);
      setApplications(prev => prev.map(a => 
        a._id === app._id ? { ...a, status: 'rejected' } : a
      ));
      if (selectedApp?._id === app._id) {
        setSelectedApp({ ...selectedApp, status: 'rejected' });
      }
      addToast({ type: "success", title: "Success", description: "Candidate rejected" });
    } catch (error) {
      console.error("Failed to reject:", error);
      addToast({ type: "error", title: "Error", description: "Failed to update status" });
    }
  };

  const handleStatusChange = async (status: JobApplication['status']) => {
    if (!selectedApp) return;
    
    try {
      await updateApplicationStatus(selectedApp._id, status);
      setApplications(prev => prev.map(a => 
        a._id === selectedApp._id ? { ...a, status } : a
      ));
      setSelectedApp({ ...selectedApp, status });
      addToast({ type: "success", title: "Status Updated" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update status" });
    }
  };

  const handleDelete = async () => {
    if (!selectedApp || !confirm("Are you sure you want to delete this application?")) return;
    
    try {
      await deleteJobApplication(selectedApp._id);
      setApplications(prev => prev.filter(a => a._id !== selectedApp._id));
      setSelectedApp(null);
      addToast({ type: "success", title: "Deleted" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete" });
    }
  };

  const filteredApps = applications.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.fromName.toLowerCase().includes(q) ||
      app.fromEmail.toLowerCase().includes(q) ||
      app.subject.toLowerCase().includes(q) ||
      app.appliedPosition.toLowerCase().includes(q)
    );
  });

  if (!user || !canManage) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Recruitment Inbox</h1>
          {!hasEmailConfig && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              Not Configured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSyncAt && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              Last sync: {lastSyncAt.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Sync</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={clearMockData} title="Clear test data">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/email-settings'}>
            <Mail className="h-4 w-4 mr-2" />
            Email Settings
          </Button>
        </div>
      </div>

      {/* Job ID Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium">📧 Job ID Auto-Detection</p>
        <p className="text-blue-600 mt-1">
          Emails with Job ID (e.g., JB0001) in the subject line will be automatically linked to the corresponding job position.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { key: 'all', label: 'All', count: stats.total, icon: Inbox },
          { key: 'new', label: 'New', count: stats.new, icon: Mail },
          { key: 'unread', label: 'Unread', count: stats.unread, icon: MailOpen },
          { key: 'starred', label: 'Starred', count: stats.starred, icon: Star },
          { key: 'shortlisted', label: 'Shortlisted', count: stats.shortlisted, icon: CheckCircle },
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              filter === key 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${filter === key ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${filter === key ? 'text-blue-700' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
            <Badge variant={filter === key ? "default" : "secondary"} className="text-xs">
              {count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, subject, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Content - Simple Email Inbox View */}
      <div className="flex gap-4 h-[calc(100%-12rem)]">
        {/* Email List */}
        <div className={`${selectedApp ? 'hidden lg:block lg:w-2/3' : 'w-full'} overflow-hidden`}>
          <Card className="h-full">
            <CardContent className="p-0 h-full overflow-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <Inbox className="h-12 w-12 mb-2 text-gray-300" />
                  <p>No emails found</p>
                  {!hasEmailConfig && (
                    <p className="text-sm mt-2">Configure email settings to start receiving emails</p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredApps.map((app) => (
                    <div 
                      key={app._id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b ${
                        selectedApp?._id === app._id ? 'bg-blue-50' : ''
                      } ${!app.isRead ? 'bg-white font-semibold' : 'bg-gray-50/50'}`}
                      onClick={() => handleSelect(app)}
                    >
                      {/* Star Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleStar(e, app)}
                      >
                        <Star className={`h-4 w-4 ${app.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </Button>
                      
                      {/* Sender */}
                      <div className="w-48 shrink-0">
                        <p className={`truncate ${!app.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {app.fromName || app.fromEmail}
                        </p>
                      </div>
                      
                      {/* Subject & Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`truncate ${!app.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {app.subject}
                          </span>
                          {app.hasAttachments && (
                            <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                          <span className="text-gray-500 truncate text-sm">
                            - {app.bodyText?.substring(0, 60).replace(/\n/g, ' ') || 'No preview'}...
                          </span>
                        </div>
                      </div>
                      
                      {/* Date */}
                      <div className="text-sm text-gray-500 shrink-0">
                        {new Date(app.receivedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      
                      {/* Job ID Badge (if available) */}
                      {app.jobId && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs shrink-0">
                          {app.jobId}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Detail View */}
        {selectedApp && (
          <Card className="w-full lg:w-1/3 overflow-hidden flex flex-col">
            <CardHeader className="border-b shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Email</CardTitle>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleStar(null as any, selectedApp)}
                  >
                    <Star className={`h-4 w-4 ${selectedApp.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedApp(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
              {/* Email Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{selectedApp.subject}</h3>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {(selectedApp.fromName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedApp.fromName || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{selectedApp.fromEmail}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(selectedApp.receivedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {selectedApp.jobId && (
                  <div className="mt-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                      Job ID: {selectedApp.jobId}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedApp.hasAttachments && selectedApp.attachments.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Attachments:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedApp.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-sm hover:bg-gray-100 border"
                      >
                        <Paperclip className="h-4 w-4" />
                        {att.filename}
                        <span className="text-gray-400 text-xs">({(att.size / 1024).toFixed(1)} KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div className="border-t pt-4">
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: selectedApp.body }}
                />
                {!selectedApp.body && (
                  <p className="text-gray-500 italic">{selectedApp.bodyText || 'No message body'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
