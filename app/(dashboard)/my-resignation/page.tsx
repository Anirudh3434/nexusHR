"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  LogOut, Calendar, Clock, AlertCircle, CheckCircle, 
  FileText, XCircle, ChevronDown, ChevronUp, Info
} from "lucide-react";

interface Resignation {
  _id: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  detailedReason?: string;
  status: string;
  noticePeriodDays: number;
  hrRemarks?: string;
  approvedAt?: string;
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

const reasonOptions = [
  { value: 'better_opportunity', label: 'Better Opportunity' },
  { value: 'personal_reasons', label: 'Personal Reasons' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'health_issues', label: 'Health Issues' },
  { value: 'higher_studies', label: 'Higher Studies' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'work_environment', label: 'Work Environment' },
  { value: 'career_change', label: 'Career Change' },
  { value: 'other', label: 'Other' },
];

export default function MyResignationPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [myResignation, setMyResignation] = useState<Resignation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Form state
  const [lastWorkingDate, setLastWorkingDate] = useState("");
  const [reason, setReason] = useState("");
  const [detailedReason, setDetailedReason] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);

  useEffect(() => {
    fetchMyResignation();
  }, []);

  const fetchMyResignation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resignations?myResignation=true');
      const data = await response.json();
      
      if (data.resignations && data.resignations.length > 0) {
        setMyResignation(data.resignations[0]);
      }
    } catch (error) {
      console.error("Failed to fetch resignation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.companyId) {
      addToast({ type: "error", title: "Error", description: "Company information not found" });
      return;
    }

    // Use user.id as fallback for employeeId if not set
    const employeeIdToUse = user.employeeId || user.id;

    try {
      setSubmitting(true);
      const response = await fetch('/api/resignations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeIdToUse,
          companyId: user.companyId,
          lastWorkingDate,
          reason,
          detailedReason,
          noticePeriodDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({ type: "success", title: "Success", description: "Resignation submitted successfully" });
        setMyResignation(data.resignation);
        setShowForm(false);
        // Reset form
        setLastWorkingDate("");
        setReason("");
        setDetailedReason("");
        setNoticePeriodDays(30);
      } else {
        const error = await response.json();
        if (error.existingResignation) {
          addToast({ type: "info", title: "Already Submitted", description: error.message });
        } else {
          addToast({ type: "error", title: "Error", description: error.message || "Failed to submit resignation" });
        }
      }
    } catch (error) {
      console.error("Failed to submit resignation:", error);
      addToast({ type: "error", title: "Error", description: "Failed to submit resignation" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myResignation || !confirm('Are you sure you want to withdraw your resignation?')) return;

    try {
      const response = await fetch(`/api/resignations?id=${myResignation._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Resignation withdrawn successfully" });
        setMyResignation({ ...myResignation, status: 'withdrawn' });
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to withdraw resignation:", error);
      addToast({ type: "error", title: "Error", description: "Failed to withdraw resignation" });
    }
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

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100';
      case 'rejected': return 'bg-red-100';
      case 'pending': return 'bg-yellow-100';
      case 'under_review': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'under_review': return <Info className="h-5 w-5 text-blue-600" />;
      default: return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDaysUntilLastDay = () => {
    if (!myResignation) return 0;
    const lwd = new Date(myResignation.lastWorkingDate);
    const today = new Date();
    const diffTime = lwd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">Resignation Portal</h1>
        <p className="text-sm text-gray-500">Submit or manage your resignation request</p>
      </div>

      {/* No Active Resignation - Show Submit Form */}
      {!myResignation || (myResignation.status !== 'pending' && myResignation.status !== 'under_review' && myResignation.status !== 'approved') ? (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <LogOut className="h-5 w-5 text-gray-600" />
              Submit Resignation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  You don't have any active resignation request.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Submit Resignation
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Working Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={lastWorkingDate}
                      onChange={(e) => setLastWorkingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notice Period (Days) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={180}
                      value={noticePeriodDays}
                      onChange={(e) => setNoticePeriodDays(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Resignation *
                  </label>
                  <select
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a reason</option>
                    {reasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detailed Reason (Optional)
                  </label>
                  <textarea
                    value={detailedReason}
                    onChange={(e) => setDetailedReason(e.target.value)}
                    placeholder="Provide additional details about your resignation..."
                    maxLength={1000}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{detailedReason.length}/1000 characters</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Please ensure you have discussed your decision with your manager before submitting. 
                    This action will notify HR and initiate the exit process.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Resignation'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Active Resignation - Show Status */
        <Card className="border-gray-200 overflow-hidden">
          <div className="p-5">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getStatusBgColor(myResignation.status)}`}>
                  {getStatusIcon(myResignation.status)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Resignation Status</h3>
                  <Badge className={`${getStatusColor(myResignation.status)} text-xs mt-1`}>
                    {myResignation.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              {['pending', 'under_review'].includes(myResignation.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWithdraw}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Withdraw
                </Button>
              )}
            </div>

            {/* Key Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted On</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(myResignation.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Working Day</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(myResignation.lastWorkingDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
                <p className="text-sm font-medium text-gray-900">
                  {getDaysUntilLastDay()} days
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Notice Period</p>
                <p className="text-sm font-medium text-gray-900">
                  {myResignation.noticePeriodDays} days
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="pt-4">
              <p className="text-sm text-gray-500 mb-1">Reason</p>
              <p className="text-sm font-medium text-gray-900">
                {reasonLabels[myResignation.reason] || myResignation.reason}
              </p>
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-4"
            >
              {expanded ? (
                <><ChevronUp className="h-4 w-4" /> Hide Details</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> View Details</>
              )}
            </button>

            {expanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                {myResignation.detailedReason && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Detailed Reason</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {myResignation.detailedReason}
                    </p>
                  </div>
                )}

                {myResignation.hrRemarks && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">HR Remarks</p>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                      {myResignation.hrRemarks}
                    </p>
                  </div>
                )}

                {myResignation.approvedAt && (
                  <p className="text-sm text-gray-500">
                    Approved on {new Date(myResignation.approvedAt).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Exit Process
            </h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>1. Submit resignation with notice period</li>
              <li>2. HR reviews and approves/rejects</li>
              <li>3. Complete knowledge transfer</li>
              <li>4. Return company assets</li>
              <li>5. Exit interview</li>
              <li>6. Final settlement</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Notice Period Policy
            </h4>
            <p className="text-sm text-gray-600">
              Standard notice period is 30 days. During this period, you are expected to:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mt-2">
              <li>• Complete ongoing tasks</li>
              <li>• Document your work</li>
              <li>• Train your replacement</li>
              <li>• Return all company assets</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
