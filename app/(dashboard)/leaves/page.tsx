"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { getLeaves, updateLeaveStatus, LeaveRequest } from "../../../services/leaveService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";

export default function LeaveManagementPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && user && !hasRole(["admin", "hr"])) {
      router.push("/unauthorized");
    }
  }, [user, loading, hasRole, router]);

  useEffect(() => {
    if (user && hasRole(["admin", "hr"])) {
      fetchLeaves();
    }
  }, [user]);

  const fetchLeaves = async () => {
    try {
      setDataLoading(true);
      const data = await getLeaves();
      setLeaves(data);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateLeaveStatus({ id, status: 'Approved', approvedBy: user?.id });
      fetchLeaves();
    } catch (error) {
      console.error("Failed to approve leave:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateLeaveStatus({ id, status: 'Rejected', approvedBy: user?.id });
      fetchLeaves();
    } catch (error) {
      console.error("Failed to reject leave:", error);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedTodayCount = leaves.filter(l => l.status === 'Approved' && new Date(l.updatedAt || '').toDateString() === new Date().toDateString()).length;
  const onLeaveNowCount = leaves.filter(l => {
    if (l.status !== 'Approved') return false;
    const today = new Date();
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    return today >= start && today <= end;
  }).length;

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-gray-500">Review and approve employee leave requests.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{dataLoading ? '-' : pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{dataLoading ? '-' : approvedTodayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">On Leave Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{dataLoading ? '-' : onLeaveNowCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>A list of recent leave applications from employees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2 text-gray-500">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((request: LeaveRequest) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.employeeName || request.employeeId}</div>
                      <div className="text-xs text-gray-500">{request.department || 'Unknown Department'}</div>
                    </TableCell>
                    <TableCell>{request.type} Leave</TableCell>
                    <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                        ${request.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      {request.status === "Pending" && (
                        <>
                          <Button variant="outline" size="sm" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleApprove(request.id)}>Approve</Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleReject(request.id)}>Reject</Button>
                        </>
                      )}
                      {request.status !== "Pending" && <span className="text-gray-400 text-sm">Processed</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
