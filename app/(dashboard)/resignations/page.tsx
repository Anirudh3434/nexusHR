"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  LogOut, Users, Clock, CheckCircle, XCircle, AlertCircle,
  Search, Calendar, MessageSquare, ExternalLink, FileText, 
  Briefcase, User, ChevronDown, ChevronUp
} from "lucide-react";

interface Resignation {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string;
    designation: string;
  };
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  detailedReason?: string;
  status: string;
  noticePeriodDays: number;
  exitInterviewCompleted: boolean;
  exitInterviewNotes?: string;
  hrRemarks?: string;
  approvedBy?: { name: string };
  approvedAt?: string;
  assetsReturned: boolean;
  clearanceStatus: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  better_opportunity: 'Better Opportunity',
  personal_reasons: 'Personal Reasons',
  relocation: 'Relocation',
  health_issues: 'Health Issues',
  higher_studies: 'Higher Studies',
  entrepreneurship: 'Entrepreneurship',
  work_environment: 'Work Environment',
  career_change: 'Career Change',
  other: 'Other',
};

export default function ResignationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedResignation, setSelectedResignation] = useState<Resignation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // HR remarks form
  const [hrRemarks, setHrRemarks] = useState("");
  const [exitInterviewNotes, setExitInterviewNotes] = useState("");

  useEffect(() => {
    if (user?.companyId) {
      fetchResignations();
    }
  }, [user?.companyId]);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`/api/resignations?${params.toString()}`);
      const data = await response.json();
      setResignations(data.resignations || []);
    } catch (error) {
      console.error("Failed to fetch resignations:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load resignations" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/resignations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status,
          hrRemarks: hrRemarks || undefined,
          exitInterviewNotes: exitInterviewNotes || undefined,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: `Resignation ${status}` });
        fetchResignations();
        setSelectedResignation(null);
        setHrRemarks("");
        setExitInterviewNotes("");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      addToast({ type: "error", title: "Error", description: "Failed to update resignation" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'withdrawn': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredResignations = resignations.filter(r => {
    const matchesSearch = 
      r.employeeId?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reasonLabels[r.reason]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: resignations.length,
    pending: resignations.filter(r => r.status === 'pending').length,
    underReview: resignations.filter(r => r.status === 'under_review').length,
    approved: resignations.filter(r => r.status === 'approved').length,
    rejected: resignations.filter(r => r.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Resignations</h1>
          <p className="text-sm text-gray-500">Manage employee resignation requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'yellow' },
          { label: 'Under Review', value: stats.underReview, icon: AlertCircle, color: 'indigo' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'green' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md bg-${color}-50`}>
                <Icon className={`h-4 w-4 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, department, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      {/* Resignations List */}
      <div className="space-y-3">
        {filteredResignations.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <LogOut className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No resignations</h3>
              <p className="text-gray-500 text-sm">No resignation requests found</p>
            </CardContent>
          </Card>
        ) : (
          filteredResignations.map((resignation) => (
            <Card key={resignation._id} className="border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {resignation.employeeId?.firstName} {resignation.employeeId?.lastName}
                      </span>
                      <Badge className={`${getStatusColor(resignation.status)} text-xs px-2 py-0.5`}>
                        {resignation.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-2">
                      <span>{resignation.employeeId?.employeeId}</span>
                      <span>{resignation.employeeId?.department}</span>
                      <span>{resignation.employeeId?.designation}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        Submitted: {new Date(resignation.createdAt).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <LogOut className="h-3.5 w-3.5" />
                        Last Working Day: {new Date(resignation.lastWorkingDate).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3.5 w-3.5" />
                        Notice: {resignation.noticePeriodDays} days
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-start gap-2">
                    {resignation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(resignation._id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedResignation(resignation)}
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {resignation.status === 'under_review' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(resignation._id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedResignation(resignation)}
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(resignation._id)}
                      className="text-gray-500 h-8 px-2"
                    >
                      {expandedId === resignation._id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === resignation._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Reason for Resignation</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {reasonLabels[resignation.reason] || resignation.reason}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Detailed Reason</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded min-h-[60px]">
                          {resignation.detailedReason || 'No detailed reason provided'}
                        </p>
                      </div>
                    </div>

                    {resignation.hrRemarks && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">HR Remarks</h4>
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                          {resignation.hrRemarks}
                        </p>
                      </div>
                    )}

                    {resignation.exitInterviewCompleted && resignation.exitInterviewNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Exit Interview Notes</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {resignation.exitInterviewNotes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Exit Interview:</span>
                        <Badge variant={resignation.exitInterviewCompleted ? 'default' : 'outline'} className="text-xs">
                          {resignation.exitInterviewCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Assets Returned:</span>
                        <Badge variant={resignation.assetsReturned ? 'default' : 'outline'} className="text-xs">
                          {resignation.assetsReturned ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Clearance:</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          resignation.clearanceStatus === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : resignation.clearanceStatus === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {resignation.clearanceStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {resignation.approvedBy && (
                      <div className="text-sm text-gray-500">
                        Approved by: <span className="font-medium">{resignation.approvedBy.name}</span>
                        {resignation.approvedAt && (
                          <span> on {new Date(resignation.approvedAt).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {selectedResignation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reject Resignation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HR Remarks (Optional)
                </label>
                <textarea
                  value={hrRemarks}
                  onChange={(e) => setHrRemarks(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exit Interview Notes
                </label>
                <textarea
                  value={exitInterviewNotes}
                  onChange={(e) => setExitInterviewNotes(e.target.value)}
                  placeholder="Enter exit interview notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedResignation(null);
                    setHrRemarks("");
                    setExitInterviewNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleStatusUpdate(selectedResignation._id, 'rejected')}
                >
                  Reject Resignation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
