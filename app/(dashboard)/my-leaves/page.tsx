"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { getLeaves, createLeave, LeaveRequest } from "../../../services/leaveService";
import { Loader2, Plus, X, Calendar } from "lucide-react";

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
  }, [user]);

  const fetchLeaves = async () => {
    try {
      setDataLoading(true);
      const data = await getLeaves({ employeeId: user?.id });
      setLeaves(data);
      
      // Calculate used leaves by type from approved leaves
      const usedByType = data.reduce((acc: any, leave: LeaveRequest) => {
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
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to submit leave request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Leaves</h1>
          <p className="text-gray-500">Manage your leave requests and view your current time-off balances.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {/* Overview Cards - Dynamic Data */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Annual Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : balances.annual.remaining}
              <span className="text-sm font-normal text-gray-500 ml-1">days</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Used: {balances.annual.used} / {balances.annual.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Sick Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : balances.sick.remaining}
              <span className="text-sm font-normal text-gray-500 ml-1">days</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Used: {balances.sick.used} / {balances.sick.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>Your past and upcoming leave requests awaiting approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
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
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave: LeaveRequest) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.type} Leave</TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{leave.totalDays || calculateDays(leave.startDate, leave.endDate)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                        ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' 
                        : leave.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'}`}>
                        {leave.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {leave.status === "Pending" ? (
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Request Leave</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              {formData.startDate && formData.endDate && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  Total Days: <span className="font-semibold">{calculateDays(formData.startDate, formData.endDate)}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Enter reason for leave..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
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
    </div>
  );
}
