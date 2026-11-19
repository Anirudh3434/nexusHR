"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getLeaves, updateLeaveStatus, LeaveRequest } from "../../../services/leaveService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { LeaveDetailsModal } from "../../../components/leave/LeaveDetailsModal";
import {
  ShieldCheck,
  Loader2,
  Check,
  X,
  Clock,
  Calendar,
  Eye,
  Users,
  Search,
  CheckCircle2,
} from "lucide-react";

const STATUS_TABS = ["All", "Pending", "Approved", "Rejected"] as const;

const calculateDays = (start: string, end: string) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 1;
  return Math.max(Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1, 1);
};

export default function LeaveApprovalsPage() {
  const { user, loading, hasRole } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const canApprove = hasRole(["super_admin", "manager", "admin", "hr"]);

  useEffect(() => {
    if (!loading && user && !canApprove) {
      router.push("/unauthorized");
    }
  }, [user, loading, canApprove, router]);

  useEffect(() => {
    if (user && canApprove) fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canApprove]);

  const fetchLeaves = async () => {
    try {
      setDataLoading(true);
      // The API scopes managers to their own reporting hierarchy.
      const data = await getLeaves();
      // A manager cannot approve their own leave; keep it on "My Leaves".
      setLeaves(data.filter((leave) => String(leave.employeeId) !== String(user?.id)));
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load leave requests" });
    } finally {
      setDataLoading(false);
    }
  };

  const decide = async (leave: LeaveRequest, status: "Approved" | "Rejected") => {
    setActionId(leave.id);
    try {
      await updateLeaveStatus({ id: leave.id, status });
      addToast({
        type: "success",
        title: status === "Approved" ? "Leave approved" : "Leave rejected",
        description: `${leave.employeeName || "Employee"}'s ${leave.type} leave request was ${status.toLowerCase()}.`,
      });
      setSelectedLeave(null);
      await fetchLeaves();
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} leave:`, error);
      addToast({
        type: "error",
        title: "Error",
        description: `Failed to ${status.toLowerCase()} leave request`,
      });
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = useMemo(() => leaves.filter((l) => l.status === "Pending").length, [leaves]);
  const onLeaveNowCount = useMemo(() => {
    const today = new Date();
    return leaves.filter((l) => {
      if (l.status !== "Approved") return false;
      return today >= new Date(l.startDate) && today <= new Date(l.endDate);
    }).length;
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return leaves.filter((leave) => {
      const matchesStatus = statusFilter === "All" || leave.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return (
        (leave.employeeName || "").toLowerCase().includes(query) ||
        (leave.department || "").toLowerCase().includes(query) ||
        (leave.type || "").toLowerCase().includes(query)
      );
    });
  }, [leaves, statusFilter, searchQuery]);

  if (loading || !user) return null;

  const statusBadge = (status: LeaveRequest["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/20 bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <X className="h-3 w-3" /> {status === "Cancelled" ? "Withdrawn" : status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 sm:space-y-6">
      <PageHeader
        icon={<ShieldCheck />}
        title="Leave Approvals"
        description="Only requests from your reporting hierarchy appear here. Approve or reject your team's leave."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <Card className="border-border/80 bg-card/60 p-3 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate sm:text-xs">
            Awaiting Your Action
          </p>
          <div className="mt-0.5 text-xl font-black text-amber-600 dark:text-amber-400 sm:mt-1 sm:text-2xl">
            {dataLoading ? "-" : pendingCount}
          </div>
          <p className="mt-0.5 hidden text-[10px] text-muted-foreground xs:block">Pending requests</p>
        </Card>

        <Card className="border-border/80 bg-card/60 p-3 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate sm:text-xs">
            On Leave Now
          </p>
          <div className="mt-0.5 text-xl font-black text-blue-600 dark:text-blue-400 sm:mt-1 sm:text-2xl">
            {dataLoading ? "-" : onLeaveNowCount}
          </div>
          <p className="mt-0.5 hidden text-[10px] text-muted-foreground xs:block">Currently away</p>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 p-4 pb-3 sm:p-6 sm:pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Team Requests</CardTitle>
              <CardDescription className="text-xs">
                Requests outside your reporting hierarchy are never shown to you.
              </CardDescription>
            </div>

            <div className="flex flex-col items-stretch gap-2 xs:flex-row xs:items-center">
              <div className="relative w-full xs:w-48">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-1 xs:self-auto">
                {STATUS_TABS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      statusFilter === status
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {status}
                    {status === "Pending" && pendingCount > 0 && (
                      <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-600 dark:text-amber-400">
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Users size={18} />}
                title={statusFilter === "Pending" ? "No pending approvals" : "No leave requests found"}
                description="Requests from the people who report to you will appear here."
              />
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-border/60 md:hidden">
                {filteredLeaves.map((leave) => (
                  <div key={leave.id} className="space-y-3 p-4 transition-colors hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">
                          {leave.employeeName || leave.employeeId}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {leave.department || "General"}
                        </div>
                      </div>
                      <div className="shrink-0">{statusBadge(leave.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/40 p-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Leave Type
                        </span>
                        <span className="font-semibold text-foreground">{leave.type} Leave</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Duration
                        </span>
                        <span className="font-semibold text-foreground">
                          {leave.totalDays || calculateDays(leave.startDate, leave.endDate)} day(s)
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 border-t border-border/40 pt-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="font-medium text-foreground">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </span>
                        <span>→</span>
                        <span className="font-medium text-foreground">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5"
                        onClick={() => setSelectedLeave(leave)}
                      >
                        <Eye className="h-4 w-4" /> View
                      </Button>
                      {leave.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            className="h-9 flex-1 gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                            onClick={() => decide(leave, "Approved")}
                            disabled={actionId === leave.id}
                          >
                            {actionId === leave.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1 gap-1.5 border-rose-300 font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/20"
                            onClick={() => decide(leave, "Rejected")}
                            disabled={actionId === leave.id}
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">
                            {leave.employeeName || leave.employeeId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {leave.department || "Unknown Department"}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{leave.type} Leave</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {leave.totalDays || calculateDays(leave.startDate, leave.endDate)}
                        </TableCell>
                        <TableCell>{statusBadge(leave.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => setSelectedLeave(leave)}
                            >
                              <Eye size={13} /> View
                            </Button>
                            {leave.status === "Pending" ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 border-emerald-200 font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400"
                                  onClick={() => decide(leave, "Approved")}
                                  disabled={actionId === leave.id}
                                >
                                  <Check size={13} /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 border-rose-200 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400"
                                  onClick={() => decide(leave, "Rejected")}
                                  disabled={actionId === leave.id}
                                >
                                  <X size={13} /> Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Processed</span>
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

      <LeaveDetailsModal
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title="Leave Request Details"
        actions={
          selectedLeave?.status === "Pending" ? (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => decide(selectedLeave, "Approved")}
                disabled={actionId === selectedLeave.id}
              >
                {actionId === selectedLeave.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400"
                onClick={() => decide(selectedLeave, "Rejected")}
                disabled={actionId === selectedLeave.id}
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Reject
              </Button>
            </>
          ) : null
        }
      />
    </div>
  );
}
