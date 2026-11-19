"use client";

import React, { useEffect } from "react";
import {
  X,
  CalendarDays,
  Clock,
  FileText,
  MessageSquare,
  User as UserIcon,
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
} from "lucide-react";
import { ModalPortal } from "../ui/ModalPortal";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import type { LeaveRequest } from "../../services/leaveService";

interface LeaveDetailsModalProps {
  leave: LeaveRequest | null;
  onClose: () => void;
  /** Optional footer actions (e.g. Withdraw / Approve / Reject). */
  actions?: React.ReactNode;
  title?: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const calculateDays = (start: string, end: string) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 1;
  return Math.max(Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1, 1);
};

const STATUS_STYLES: Record<string, { classes: string; icon: React.ReactNode; label: string }> = {
  Pending: {
    classes: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
    icon: <Hourglass className="h-3.5 w-3.5" />,
    label: "Pending approval",
  },
  Approved: {
    classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Approved",
  },
  Rejected: {
    classes: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Rejected",
  },
  Cancelled: {
    classes: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
    icon: <Ban className="h-3.5 w-3.5" />,
    label: "Withdrawn",
  },
};

const approverName = (leave: LeaveRequest): string | null => {
  const approver = leave.approvedBy;
  if (!approver) return null;
  if (typeof approver === "string") return null;
  return approver.name || null;
};

export function LeaveDetailsModal({ leave, onClose, actions, title }: LeaveDetailsModalProps) {
  useEffect(() => {
    if (!leave) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [leave, onClose]);

  if (!leave) return null;

  const status = STATUS_STYLES[leave.status] ?? STATUS_STYLES.Cancelled;
  const days = leave.totalDays || calculateDays(leave.startDate, leave.endDate);
  const approver = approverName(leave);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/70 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:rounded-2xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Leave request details"}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {title || "Leave Request Details"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {leave.type} leave · {days} {days === 1 ? "day" : "days"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  status.classes
                )}
              >
                {status.icon}
                {status.label}
              </span>
              {leave.createdAt && (
                <span className="text-[11px] text-muted-foreground">
                  Requested {formatDate(leave.createdAt)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <UserIcon className="h-3 w-3" /> Employee
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {leave.employeeName || leave.employeeId}
                </p>
                {leave.department && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {leave.department}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Duration
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {days} {days === 1 ? "day" : "days"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{leave.type} leave</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:col-span-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3 w-3" /> Date range
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span>{formatDate(leave.startDate)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{formatDate(leave.endDate)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3 w-3" /> Reason
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {leave.reason?.trim() || "No reason provided."}
              </p>
            </div>

            {(approver || leave.comment) && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> Decision
                </p>
                {approver && (
                  <p className="mt-1 text-[13px] text-foreground">
                    Actioned by <strong className="font-semibold">{approver}</strong>
                  </p>
                )}
                {leave.comment && (
                  <p className="mt-1 whitespace-pre-wrap text-[13px] italic text-muted-foreground">
                    “{leave.comment}”
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5">
            {actions}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default LeaveDetailsModal;
