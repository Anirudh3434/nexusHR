"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { getLeaves, updateLeaveStatus, LeaveRequest } from "../../../services/leaveService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { 
  Loader2, 
  FileClock, 
  Calendar, 
  Check, 
  X, 
  Search, 
  CheckCircle2, 
  Clock, 
  User as UserIcon,
  Filter
} from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";

export default function LeaveManagementPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && user && !hasRole(["admin", "hr"])) {
      router.push("/unauthorized");
    }
  }, [user, loading, hasRole, router]);

  useEffect(() => {
    if (user && hasRole(["admin", "hr"])) {
      fetchLeaves();
    }
  }, [user?.companyId, user?.role]);

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

  const filteredLeaves = leaves.filter((leave) => {
    const matchesStatus = statusFilter === "All" || leave.status === statusFilter;
    const name = (leave.employeeName || "").toLowerCase();
    const dept = (leave.department || "").toLowerCase();
    const type = (leave.type || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || name.includes(query) || dept.includes(query) || type.includes(query);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="h-3 w-3" /> Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <X className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {status}
          </span>
        );
    }
  };

  const calculateDays = (start: string | Date, end: string | Date) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diff, 1);
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      <PageHeader
        icon={<FileClock />}
        title="Leave Management"
        description="Review and approve employee leave requests."
      />

      {/* KPI Stat Cards: Clean 3-column responsive layout */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Pending
          </p>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">
            {dataLoading ? '-' : pendingCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block truncate">Needs approval</p>
        </Card>

        <Card className="border-border/80 bg-card/60 backdrop-blur-sm p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Approved Today
          </p>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
            {dataLoading ? '-' : approvedTodayCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block truncate">Processed today</p>
        </Card>

        <Card className="border-border/80 bg-card/60 backdrop-blur-sm p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            On Leave Now
          </p>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1">
            {dataLoading ? '-' : onLeaveNowCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block truncate">Currently away</p>
        </Card>
      </div>

      {/* Main Leave Requests Section */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Recent Requests</CardTitle>
              <CardDescription className="text-xs">
                A list of recent leave applications from employees.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <div className="relative w-full xs:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60 self-start xs:self-auto overflow-x-auto max-w-full">
                {["All", "Pending", "Approved", "Rejected"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === status
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                    {status === "Pending" && pendingCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {dataLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No leave requests found."
                description="Requests appear here when employees apply for leave."
              />
            </div>
          ) : (
            <>
              {/* --- 1. MOBILE CARD VIEW (< 768px): Fully readable, no clipped columns --- */}
              <div className="divide-y divide-border/60 md:hidden">
                {filteredLeaves.map((request) => (
                  <div key={request.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                    {/* Header: Employee Name, Department & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {request.employeeName || request.employeeId}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {request.department || "General"}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {/* Leave details & Date Range */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Leave Type
                        </span>
                        <span className="font-semibold text-foreground">
                          {request.type} Leave
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Duration
                        </span>
                        <span className="font-semibold text-foreground">
                          {calculateDays(request.startDate, request.endDate)} day(s)
                        </span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-border/40 flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-foreground font-medium">
                          {new Date(request.startDate).toLocaleDateString()}
                        </span>
                        <span>→</span>
                        <span className="text-foreground font-medium">
                          {new Date(request.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    {request.status === "Pending" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                          onClick={() => handleApprove(request.id)}
                        >
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold gap-1.5"
                          onClick={() => handleReject(request.id)}
                        >
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                        <span>Application processed</span>
                        <span className="font-mono text-[10px]">ID: {request.id.slice(-6)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* --- 2. DESKTOP TABLE VIEW (>= 768px): Clean horizontal-scrolling table --- */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[700px]">
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
                    {filteredLeaves.map((request: LeaveRequest) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">
                            {request.employeeName || request.employeeId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {request.department || 'Unknown Department'}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {request.type} Leave
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(request.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(request.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "Pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold gap-1" 
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check size={13} /> Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-500/30 font-semibold gap-1" 
                                onClick={() => handleReject(request.id)}
                              >
                                <X size={13} /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Processed</span>
                          )}
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
    </div>
  );
}
