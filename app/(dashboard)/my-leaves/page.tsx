"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { getLeaves, createLeave, updateLeaveStatus, LeaveRequest } from "../../../services/leaveService";
import { Loader2, Plus, X, Calendar, FileClock, Eye, Ban, CheckCircle2, XCircle, Clock } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { LeaveDetailsModal } from "../../../components/leave/LeaveDetailsModal";

// Helper to format date
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Calculate days between dates
const calculateDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

export default function MyLeavesPage() {
  const { user, loading } = useAuth();
  const { addToast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'Annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Leave balances (calculated from approved leaves)
  const [balances, setBalances] = useState({
    annual: { total: 24, used: 0, remaining: 24 },
    sick: { total: 12, used: 0, remaining: 12 },
    casual: { total: 8, used: 0, remaining: 8 },
  });

  useEffect(() => {
    if (user) fetchLeaves();
  }, [user?.id]);

  const fetchLeaves = async () => {
    try {
      setDataLoading(true);
      const data = await getLeaves({ employeeId: user?.id });
      setLeaves(data);
      
      // Calculate used leaves by type from approved leaves
      const usedByType = data.reduce<Record<string, number>>((acc, leave) => {
        if (leave.status === 'Approved') {
          const days = leave.totalDays || calculateDays(leave.startDate, leave.endDate);
          acc[leave.type.toLowerCase()] = (acc[leave.type.toLowerCase()] || 0) + days;
        }
        return acc;
      }, {});
      
      setBalances({
        annual: { total: 24, used: usedByType.annual || 0, remaining: 24 - (usedByType.annual || 0) },
        sick: { total: 12, used: usedByType.sick || 0, remaining: 12 - (usedByType.sick || 0) },
        casual: { total: 8, used: usedByType.casual || 0, remaining: 8 - (usedByType.casual || 0) },
      });
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) {
      addToast({ type: 'error', title: 'Error', description: 'Company information missing' });
      return;
    }

    setIsSubmitting(true);
    try {
      const totalDays = calculateDays(formData.startDate, formData.endDate);
      await createLeave({
        employeeId: user.id,
        companyId: user.companyId,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays,
        reason: formData.reason,
      });
      
      addToast({ type: 'success', title: 'Success', description: 'Leave request submitted' });
      setShowModal(false);
      setFormData({ type: 'Annual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to submit leave request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;

  // Withdraw a pending request. Approved/rejected leaves can no longer be withdrawn.
  const handleWithdraw = async (leave: LeaveRequest) => {
    if (leave.status !== 'Pending') return;
    if (!window.confirm(`Withdraw your ${leave.type} leave request (${formatDate(leave.startDate)} → ${formatDate(leave.endDate)})?`)) {
      return;
    }

    setWithdrawingId(leave.id);
    try {
      await updateLeaveStatus({ id: leave.id, status: 'Cancelled' });
      addToast({
        type: 'success',
        title: 'Leave withdrawn',
        description: 'Your request has been withdrawn and sent back to your manager.',
      });
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error) {
      console.error('Failed to withdraw leave:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to withdraw leave request' });
    } finally {
      setWithdrawingId(null);
    }
  };

  const statusBadgeClass = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'Cancelled':
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      default:
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    }
  };

  const statusIcon = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'Pending':
        return <Clock className="h-3 w-3" />;
      case 'Cancelled':
        return <Ban className="h-3 w-3" />;
      default:
        return <XCircle className="h-3 w-3" />;
    }
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <PageHeader
        icon={<FileClock />}
        title="My Leaves"
        description="Manage your leave requests and view your current time-off balances."
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Leave
          </Button>
        }
      />

      {/* Overview Cards - Dynamic Data */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="p-3 sm:p-4 border-border/80 bg-card/60 backdrop-blur-sm">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Annual Leave</p>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 sm:mt-1">
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : balances.annual.remaining}
            <span className="text-xs font-normal text-muted-foreground ml-1">days</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">Used: {balances.annual.used}/{balances.annual.total}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/80 bg-card/60 backdrop-blur-sm">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Sick Leave</p>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 sm:mt-1">
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : balances.sick.remaining}
            <span className="text-xs font-normal text-muted-foreground ml-1">days</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">Used: {balances.sick.used}/{balances.sick.total}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-border/80 bg-card/60 backdrop-blur-sm">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Pending</p>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : pendingCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">Awaiting review</p>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/60">
          <CardTitle className="text-base sm:text-lg">Leave History</CardTitle>
          <CardDescription className="text-xs">Your past and upcoming leave requests awaiting approval.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dataLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No leave requests found."
                description="Your requests will appear here once you apply."
                icon={<Calendar size={18} />}
              />
            </div>
          ) : (
            <>
              {/* Mobile Card List (< 768px) */}
              <div className="divide-y divide-border/60 md:hidden">
                {leaves.map((leave: LeaveRequest) => (
                  <div key={leave.id} className="p-4 space-y-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {leave.type} Leave
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3 text-primary shrink-0" />
                          <span>{formatDate(leave.startDate)} → {formatDate(leave.endDate)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(leave.status)}`}>
                        {statusIcon(leave.status)}
                        {leave.status === 'Cancelled' ? 'Withdrawn' : leave.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span>Duration: <strong className="text-foreground">{leave.totalDays || calculateDays(leave.startDate, leave.endDate)} day(s)</strong></span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setSelectedLeave(leave)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {leave.status === "Pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-500/30 gap-1"
                            onClick={() => handleWithdraw(leave)}
                            disabled={withdrawingId === leave.id}
                          >
                            {withdrawingId === leave.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave: LeaveRequest) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-semibold text-foreground">{leave.type} Leave</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(leave.startDate)}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(leave.endDate)}</TableCell>
                        <TableCell className="font-medium">{leave.totalDays || calculateDays(leave.startDate, leave.endDate)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(leave.status)}`}>
                            {statusIcon(leave.status)}
                            {leave.status === 'Cancelled' ? 'Withdrawn' : leave.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => setSelectedLeave(leave)}
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                            {leave.status === "Pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-500/30 font-semibold gap-1"
                                onClick={() => handleWithdraw(leave)}
                                disabled={withdrawingId === leave.id}
                              >
                                {withdrawingId === leave.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5" />
                                )}
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Request Leave</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-slate-600"
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">From Date *</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">To Date *</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              {formData.startDate && formData.endDate && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded dark:text-slate-400 dark:bg-slate-800/50">
                  Total Days: <span className="font-semibold">{calculateDays(formData.startDate, formData.endDate)}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Enter reason for leave..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] dark:border-slate-600"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full leave details */}
      <LeaveDetailsModal
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        actions={
          selectedLeave?.status === "Pending" ? (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-500/30"
              onClick={() => handleWithdraw(selectedLeave)}
              disabled={withdrawingId === selectedLeave.id}
            >
              {withdrawingId === selectedLeave.id ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="mr-1.5 h-3.5 w-3.5" />
              )}
              Withdraw request
            </Button>
          ) : null
        }
      />
    </div>
  );
}
