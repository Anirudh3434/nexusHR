"use client";

import React, { useState, useEffect } from "react";
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
  Paperclip, Trash2
} from "lucide-react";

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
}

export default function ApplicantsPage() {
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
        setApplicants(prev => prev.map(a => 
          a._id === id ? { ...a, status: status as any } : a
        ));
        addToast({ type: "success", title: "Success", description: `Status updated to ${status}` });
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update status" });
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
      new: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      considered: 'bg-indigo-100 text-indigo-700',
      rejected: 'bg-red-100 text-red-700',
      shortlisted: 'bg-green-100 text-green-700',
      interview: 'bg-purple-100 text-purple-700',
      hired: 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
      ? 'bg-green-100 text-green-700' 
      : 'bg-orange-100 text-orange-700';
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
          <p className="text-gray-600">Candidates who applied through careers page</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncAt && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              Last sync: {lastSyncAt.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={fetchApplicants}>
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Job ID Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium">📌 Job ID Tracking</p>
        <p className="text-blue-600 mt-1">
          Shows all applicants (both online and email) linked to a Job ID. Use filters to view by source or job position.
        </p>
      </div>

      {/* Active Job ID Filter Banner */}
      {filterJobId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="font-medium text-indigo-900">
                Filtered by Job ID: <span className="font-mono bg-indigo-100 px-2 py-1 rounded">{filterJobId}</span>
              </p>
              <p className="text-sm text-indigo-700">
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
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
          { label: 'New', value: stats.new, icon: UserCheck, color: 'blue' },
          { label: 'Considered', value: stats.considered, icon: ThumbsUp, color: 'indigo' },
          { label: 'Rejected', value: stats.rejected, icon: ThumbsDown, color: 'red' },
          { label: 'Shortlisted', value: stats.shortlisted, icon: Briefcase, color: 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${color}-100`}>
                <Icon className={`h-4 w-4 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-600">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, position, or Job ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {uniqueJobIds.length > 0 && (
          <select
            className="px-3 py-2 border rounded-md bg-white"
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
          className="px-3 py-2 border rounded-md bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="considered">Considered</option>
          <option value="rejected">Rejected</option>
          <option value="shortlisted">Shortlisted</option>
        </select>
        
        <select
          className="px-3 py-2 border rounded-md bg-white"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="website">Online (Careers Page)</option>
          <option value="email">Email</option>
        </select>

        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white">
          <input 
            type="checkbox" 
            id="showGeneral" 
            checked={showGeneral}
            onChange={(e) => setShowGeneral(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="showGeneral" className="text-sm font-medium text-gray-700 cursor-pointer">
            Show General Inquiries
          </label>
        </div>
      </div>

      {/* Applicants Table */}
      <Card>
        <CardContent className="p-0">
          {filteredApplicants.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No applicants yet</h3>
              <p className="text-gray-500">Applicants from careers page and email will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplicants.map((applicant) => (
                  <tr 
                    key={applicant._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedApplicant(applicant)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {applicant.candidateName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{applicant.candidateName || 'Unknown'}</p>
                            {applicant.hasAttachments && (
                              <span title="Has attachments">
                                <Paperclip className="h-3 w-3 text-blue-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{applicant.fromEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {applicant.jobId ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
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
                      <p className="text-sm text-gray-900">{applicant.appliedPosition || 'N/A'}</p>
                      {applicant.currentDesignation && (
                        <p className="text-xs text-gray-500">Current: {applicant.currentDesignation}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{applicant.experience || 'N/A'}</p>
                      {applicant.noticePeriod && (
                        <p className="text-xs text-gray-500">Notice: {applicant.noticePeriod}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${getStatusColor(applicant.status)}`}>
                        {getStatusLabel(applicant.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(applicant.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => { e.stopPropagation(); handleConsider(applicant); }}
                          title="Consider"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                  {selectedApplicant.candidateName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedApplicant.candidateName}</h3>
                  <p className="text-gray-600">{selectedApplicant.appliedPosition}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedApplicant.jobId && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono">
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
              <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
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
                  <h4 className="font-medium text-gray-900 mb-2">Skills</h4>
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
                  <h4 className="font-medium text-gray-900 mb-2">Cover Letter</h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedApplicant.coverLetter}
                  </div>
                </div>
              )}

              {/* Resume / Attachments */}
              {selectedApplicant.hasAttachments && selectedApplicant.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Resume & Attachments</h4>
                  <div className="space-y-2">
                    {selectedApplicant.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span className="text-sm flex-1 truncate">{att.filename}</span>
                        <span className="text-xs text-gray-500">({(att.size / 1024).toFixed(1)} KB)</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => window.open(att.fileUrl, '_blank')}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-800"
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

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => { handleConsider(selectedApplicant); setSelectedApplicant(null); }}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Consider
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => { handleReject(selectedApplicant); setSelectedApplicant(null); }}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
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
    </div>
  );
}
