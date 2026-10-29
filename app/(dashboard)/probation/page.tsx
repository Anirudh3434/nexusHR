"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  Pencil,
  RotateCcw,
  Search,
  Timer,
  Undo2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROBATION_MONTHS,
  probationLabel,
  probationPhaseClasses,
  type ProbationPhase,
} from "@/lib/probation";

interface ProbationEmployee {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
  avatar?: string;
  joiningDate?: string | null;
  probationStatus: "on_probation" | "confirmed" | null;
  probationMonths: number | null;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationConfirmedAt?: string | null;
  probationConfirmedBy?: { name?: string } | null;
  probationNotes?: string;
  phase: ProbationPhase;
  daysLeft: number | null;
}

interface ProbationSummary {
  onProbation: number;
  dueSoon: number;
  overdue: number;
  confirmed: number;
  untracked: number;
}

type FilterKey = "due" | "all" | "confirmed" | "untracked";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "due", label: "On probation" },
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "untracked", label: "Not tracked" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ProbationPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [employees, setEmployees] = useState<ProbationEmployee[]>([]);
  const [summary, setSummary] = useState<ProbationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("due");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ months: String(DEFAULT_PROBATION_MONTHS), startDate: "", notes: "" });

  const canManage = ["super_admin", "admin", "hr"].includes(user?.role || "");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/probation");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load probation");
      setEmployees(data.employees || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to load probation:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load probation records" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Load once on mount; refresh is explicit via the header button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (employee: ProbationEmployee, body: Record<string, unknown>) => {
    const actionLabel: Record<string, string> = {
      start: "probation started",
      confirm: "probation confirmed",
      extend: "probation extended",
      reset: "window reset",
      undo: "reopened for review",
    };
    try {
      setSavingId(employee.id);
      const res = await fetch("/api/probation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employee.id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      addToast({
        type: "success",
        title: "Probation updated",
        description: `${employee.name} — ${actionLabel[String(body.action)] || "updated"}`,
      });
      setEditingId(null);
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        description: error instanceof Error ? error.message : "Could not update probation",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openEditor = (employee: ProbationEmployee) => {
    setEditingId(employee.id);
    setDraft({
      months: String(employee.probationMonths ?? DEFAULT_PROBATION_MONTHS),
      startDate: toInputDate(employee.probationStartDate || employee.joiningDate),
      notes: employee.probationNotes || "",
    });
  };

  const counts = useMemo(() => {
    const base = { onProbation: 0, dueSoon: 0, overdue: 0, confirmed: 0, untracked: 0 };
    return employees.reduce((acc, employee) => {
      if (employee.phase === "confirmed") acc.confirmed += 1;
      else if (employee.phase === "overdue") acc.overdue += 1;
      else if (employee.phase === "due_soon") acc.dueSoon += 1;
      else if (employee.phase === "active") acc.onProbation += 1;
      else acc.untracked += 1;
      return acc;
    }, base);
  }, [employees]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filter === "due" && !["overdue", "due_soon", "active"].includes(employee.phase)) return false;
      if (filter === "confirmed" && employee.phase !== "confirmed") return false;
      if (filter === "untracked" && employee.phase !== "none") return false;
      if (!query) return true;
      return [employee.name, employee.email, employee.employeeId, employee.department, employee.designation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [employees, filter, search]);

  const stats = summary ?? counts;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarClock />}
        title="Probation"
        description="New hires start on probation from their joining date. Confirm, extend, or reset each window here."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RotateCcw size={15} />
            <span className="ml-2">Refresh</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "On probation", value: stats.onProbation, icon: Timer, tone: "text-primary" },
          { label: "Due in 30 days", value: stats.dueSoon, icon: CalendarDays, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Overdue", value: stats.overdue, icon: CalendarClock, tone: "text-destructive" },
          { label: "Confirmed", value: stats.confirmed, icon: BadgeCheck, tone: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={cn("rounded-lg bg-muted p-2", tone)} aria-hidden>
                <Icon size={16} />
              </span>
              <div>
                <p className="text-xl font-semibold leading-none text-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Probation filters">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              role="tab"
              aria-selected={filter === option.key}
              onClick={() => setFilter(option.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              {option.key === "untracked" && stats.untracked > 0 ? ` (${stats.untracked})` : ""}
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ID, department…"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading probation" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={18} />}
            title="No probation records"
            description={
              filter === "due"
                ? "Nobody is on probation or due for confirmation right now."
                : "No employees match this filter."
            }
            compact
          />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((employee) => {
              const isEditing = editingId === employee.id;
              const busy = savingId === employee.id;
              const tracked = employee.phase !== "none";

              return (
                <li key={employee.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={employee.name} src={employee.avatar} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              probationPhaseClasses(employee.phase)
                            )}
                          >
                            {probationLabel({ phase: employee.phase, daysLeft: employee.daysLeft })}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[employee.employeeId, employee.department, employee.designation].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground sm:justify-end">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {formatDate(employee.probationStartDate || employee.joiningDate)}
                        <span aria-hidden>→</span>
                        {formatDate(employee.probationEndDate)}
                      </span>
                      {canManage && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!tracked && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                update(employee, {
                                  action: "start",
                                  months: DEFAULT_PROBATION_MONTHS,
                                })
                              }
                            >
                              Start {DEFAULT_PROBATION_MONTHS} mo
                            </Button>
                          )}
                          {tracked && employee.phase !== "confirmed" && (
                            <>
                              <Button size="sm" disabled={busy} onClick={() => update(employee, { action: "confirm" })}>
                                <Check size={14} />
                                <span className="ml-1.5">Confirm</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => update(employee, { action: "extend", months: 3 })}
                              >
                                +3 mo
                              </Button>
                            </>
                          )}
                          {employee.phase === "confirmed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => update(employee, { action: "undo" })}
                            >
                              <Undo2 size={14} />
                              <span className="ml-1.5">Reopen</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-expanded={isEditing}
                            onClick={() => (isEditing ? setEditingId(null) : openEditor(employee))}
                          >
                            <Pencil size={14} />
                            <ChevronDown size={14} className={cn("ml-1 transition-transform", isEditing && "rotate-180")} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing && canManage && (
                    <div className="mt-3 grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
                      <label className="text-xs font-medium text-muted-foreground">
                        Start date
                        <input
                          type="date"
                          value={draft.startDate}
                          onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <label className="text-xs font-medium text-muted-foreground">
                        Months
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={draft.months}
                          onChange={(event) => setDraft((prev) => ({ ...prev, months: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <label className="text-xs font-medium text-muted-foreground">
                        Note
                        <input
                          type="text"
                          maxLength={200}
                          value={draft.notes}
                          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                          placeholder="Optional"
                          className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          update(employee, {
                            action: "reset",
                            months: Number(draft.months) || DEFAULT_PROBATION_MONTHS,
                            startDate: draft.startDate || undefined,
                            notes: draft.notes,
                          })
                        }
                      >
                        Save
                      </Button>
                    </div>
                  )}

                  {employee.probationNotes && !isEditing && (
                    <p className="mt-2 text-xs text-muted-foreground">{employee.probationNotes}</p>
                  )}
                  {employee.phase === "confirmed" && employee.probationConfirmedAt && !isEditing && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Confirmed {formatDate(employee.probationConfirmedAt)}
                      {employee.probationConfirmedBy?.name ? ` by ${employee.probationConfirmedBy.name}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
