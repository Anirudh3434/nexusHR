"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  UserX, Plus, Search, Filter, Clock, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Calendar, User, AlertTriangle,
  FileText, MessageSquare, DollarSign, Briefcase
} from "lucide-react";

interface TerminationItem {
  _id: string;
  terminationNumber: string;
  type: string;
  reason: string;
  detailedReason?: string;
  status: string;
  noticeDate: string;
  terminationDate: string;
  noticePeriodDays: number;
  severanceAmount?: number;
  rejectionReason?: string;
  createdAt: string;
  
  employeeId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
  };
  
  initiatedBy: { _id: string; name: string };
  approverId?: { _id: string; name: string };
  approvedBy?: { name: string };
  approvedAt?: string;
  
  exitInterviewCompleted: boolean;
  assetsReturned: boolean;
  clearanceStatus: string;
  
  comments?: {
    authorName: string;
    role: string;
    message: string;
    createdAt: string;
  }[];
}

const typeLabels: Record<string, string> = {
  voluntary: 'Voluntary',
  involuntary: 'Involuntary',
  retirement: 'Retirement',
  end_of_contract: 'End of Contract',
  layoff: 'Layoff',
};

const reasonLabels: Record<string, string> = {
  performance_issues: 'Performance Issues',
  misconduct: 'Misconduct',
  attendance_violations: 'Attendance Violations',
  violation_of_policy: 'Policy Violation',
  redundancy: 'Redundancy',
  business_closure: 'Business Closure',
  mutual_agreement: 'Mutual Agreement',
  end_of_contract: 'End of Contract',
  retirement: 'Retirement',
  health_reasons: 'Health Reasons',
  other: 'Other',
};

const typeOptions = [
  { value: 'involuntary', label: 'Involuntary' },
  { value: 'voluntary', label: 'Voluntary' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'end_of_contract', label: 'End of Contract' },
  { value: 'layoff', label: 'Layoff' },
];

const reasonOptions = [
  { value: 'performance_issues', label: 'Performance Issues' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'attendance_violations', label: 'Attendance Violations' },
  { value: 'violation_of_policy', label: 'Policy Violation' },
  { value: 'redundancy', label: 'Redundancy' },
  { value: 'business_closure', label: 'Business Closure' },
  { value: 'mutual_agreement', label: 'Mutual Agreement' },
  { value: 'end_of_contract', label: 'End of Contract' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'health_reasons', label: 'Health Reasons' },
  { value: 'other', label: 'Other' },
];

export default function TerminationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [terminations, setTerminations] = useState<TerminationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTermination, setSelectedTermination] = useState<TerminationItem | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  
  // Form state
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [type, setType] = useState("involuntary");
  const [reason, setReason] = useState("");
  const [detailedReason, setDetailedReason] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [severanceAmount, setSeveranceAmount] = useState("");
  
  // Approval modal
  const [rejectionReason, setRejectionReason] = useState("");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (user?.companyId) {
      fetchTerminations();
      fetchEmployees();
    }
  }, [user?.companyId, filterStatus]);

  const fetchTerminations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`/api/terminations?${params.toString()}`);
      const data = await response.json();
      setTerminations(data.terminations || []);
    } catch (error) {
      console.error("Failed to fetch terminations:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load terminations" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?companyId=${user?.companyId}`);
      const data = await response.json();
      // Filter active employees and map id to _id
      const activeEmployees = data
        .filter((emp: any) => emp.isActive !== false)
        .map((emp: any) => ({ ...emp, _id: emp.id }));
      setEmployees(activeEmployees);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !reason || !terminationDate) {
      addToast({ type: "error", title: "Error", description: "Please fill all required fields" });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/terminations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          companyId: user?.companyId,
          type,
          reason,
          detailedReason,
          terminationDate,
          noticeDate: noticeDate || new Date().toISOString().split('T')[0],
          noticePeriodDays,
          severanceAmount: severanceAmount ? parseFloat(severanceAmount) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({ type: "success", title: "Success", description: `Termination ${data.termination.terminationNumber} created` });
        fetchTerminations();
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        if (error.existingTermination) {
          addToast({ type: "info", title: "Already Exists", description: error.message });
        } else {
          addToast({ type: "error", title: "Error", description: error.message });
        }
      }
    } catch (error) {
      console.error("Failed to create termination:", error);
      addToast({ type: "error", title: "Error", description: "Failed to create termination" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setType("involuntary");
    setReason("");
    setDetailedReason("");
    setTerminationDate("");
    setNoticeDate("");
    setNoticePeriodDays(30);
    setSeveranceAmount("");
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/terminations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Termination approved" });
        fetchTerminations();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async () => {
    if (!selectedTermination || !rejectionReason.trim()) return;

    try {
      const response = await fetch('/api/terminations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedTermination._id, 
          status: 'rejected',
          rejectionReason 
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Termination rejected" });
        fetchTerminations();
        setSelectedTermination(null);
        setRejectionReason("");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleAddComment = async (terminationId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/terminations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: terminationId,
          comment: newComment,
        }),
      });

      if (response.ok) {
        setNewComment("");
        fetchTerminations();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this termination?')) return;

    try {
      const response = await fetch(`/api/terminations?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Termination cancelled" });
        fetchTerminations();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'involuntary': return 'text-red-600';
      case 'layoff': return 'text-orange-600';
      case 'voluntary': return 'text-green-600';
      case 'retirement': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredTerminations = terminations.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    return (
      t.terminationNumber.toLowerCase().includes(searchLower) ||
      t.employeeId?.name?.toLowerCase().includes(searchLower) ||
      reasonLabels[t.reason]?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: terminations.length,
    pending: terminations.filter(t => t.status === 'pending').length,
    approved: terminations.filter(t => t.status === 'approved').length,
    rejected: terminations.filter(t => t.status === 'rejected').length,
    completed: terminations.filter(t => t.status === 'completed').length,
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
          <h1 className="text-xl font-semibold text-gray-900">Terminations</h1>
          <p className="text-sm text-gray-500">Manage employee terminations and exit process</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {showForm ? 'Cancel' : 'Initiate Termination'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'blue' },
          { label: 'Pending', value: stats.pending, color: 'yellow' },
          { label: 'Approved', value: stats.approved, color: 'green' },
          { label: 'Rejected', value: stats.rejected, color: 'red' },
          { label: 'Completed', value: stats.completed, color: 'gray' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-3">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Initiate Employee Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee *
                  </label>
                  <select
                    required
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} - {emp.department || 'No Dept'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Type *
                  </label>
                  <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <select
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select reason</option>
                    {reasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severance Amount (Optional)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={severanceAmount}
                      onChange={(e) => setSeveranceAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={terminationDate}
                    onChange={(e) => setTerminationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notice Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={noticePeriodDays}
                    onChange={(e) => setNoticePeriodDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Reason
                </label>
                <textarea
                  value={detailedReason}
                  onChange={(e) => setDetailedReason(e.target.value)}
                  placeholder="Provide detailed justification for termination..."
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{detailedReason.length}/2000 characters</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  This will initiate a termination request that requires manager or admin approval. 
                  Please ensure all documentation is complete before submitting.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Initiate Termination'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, employee name, or reason..."
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
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Terminations List */}
      <div className="space-y-3">
        {filteredTerminations.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <UserX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No terminations</h3>
              <p className="text-gray-500 text-sm">No termination records found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTerminations.map((termination) => (
            <Card key={termination._id} className="border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {termination.terminationNumber}
                      </code>
                      <Badge className={`${getStatusColor(termination.status)} text-xs px-2 py-0.5`}>
                        {termination.status.replace('_', ' ')}
                      </Badge>
                      <span className={`text-xs font-medium ${getTypeColor(termination.type)}`}>
                        {typeLabels[termination.type] || termination.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {termination.employeeId?.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{termination.employeeId?.department}</span>
                      <span>{termination.employeeId?.designation}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-600">
                        Reason: {reasonLabels[termination.reason] || termination.reason}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-start gap-1">
                    {/* Show approve/reject for pending approvals */}
                    {['pending', 'under_review'].includes(termination.status) && 
                     (termination.approverId?._id === user?.id || ['admin', 'manager'].includes(user?.role || '')) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(termination._id)}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTermination(termination)}
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {termination.status === 'pending' && termination.initiatedBy._id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(termination._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(termination._id)}
                      className="text-gray-500 h-8 px-2"
                    >
                      {expandedId === termination._id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Notice: {new Date(termination.noticeDate).toLocaleDateString('en-GB')}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserX className="h-3.5 w-3.5" />
                    Termination: {new Date(termination.terminationDate).toLocaleDateString('en-GB')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {termination.noticePeriodDays} days notice
                  </span>
                  {termination.severanceAmount && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Severance: ${termination.severanceAmount.toLocaleString()}
                    </span>
                  )}
                  {termination.approverId && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Briefcase className="h-3.5 w-3.5" />
                      Approver: {termination.approverId.name}
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === termination._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {termination.detailedReason && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Detailed Reason</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {termination.detailedReason}
                        </p>
                      </div>
                    )}

                    {termination.rejectionReason && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Rejection Reason</h4>
                        <p className="text-sm text-gray-600 bg-red-50 p-3 rounded">
                          {termination.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Initiator & Approval Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Initiated by:</span>{' '}
                        <span className="font-medium">{termination.initiatedBy?.name}</span>
                        <span className="text-gray-500 ml-2">
                          on {new Date(termination.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      {termination.approvedBy && (
                        <div>
                          <span className="text-gray-500">Approved by:</span>{' '}
                          <span className="font-medium">{termination.approvedBy.name}</span>
                          {termination.approvedAt && (
                            <span className="text-gray-500 ml-2">
                              on {new Date(termination.approvedAt).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Exit Status */}
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Exit Interview:</span>{' '}
                        <Badge variant={termination.exitInterviewCompleted ? 'default' : 'outline'} className="text-xs">
                          {termination.exitInterviewCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Assets:</span>{' '}
                        <Badge variant={termination.assetsReturned ? 'default' : 'outline'} className="text-xs">
                          {termination.assetsReturned ? 'Returned' : 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Clearance:</span>{' '}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          termination.clearanceStatus === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : termination.clearanceStatus === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {termination.clearanceStatus}
                        </span>
                      </div>
                    </div>

                    {/* Comments */}
                    {termination.comments && termination.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Internal Comments</h4>
                        <div className="space-y-2">
                          {termination.comments.map((comment, idx) => (
                            <div key={idx} className="bg-yellow-50 border border-yellow-100 p-3 rounded text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {comment.authorName}
                                  <span className="text-xs text-gray-500 ml-2">({comment.role})</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              <p className="text-gray-600">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Comment */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add Internal Comment</h4>
                      <div className="flex gap-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={2}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <Button
                          onClick={() => handleAddComment(termination._id)}
                          disabled={!newComment.trim()}
                          className="self-end"
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {selectedTermination && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reject Termination {selectedTermination.terminationNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTermination(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectionReason.trim()}
                  onClick={handleReject}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Termination
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
