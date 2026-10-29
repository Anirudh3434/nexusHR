"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, LogOut } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";
import {
  getNoticeInfo,
  noticeLabel,
  noticePhaseClasses,
  RESIGNATION_ACTIVE_STATUSES,
} from "../../lib/noticePeriod";
import {
  probationLabel,
  probationPhaseClasses,
  type ProbationPhase,
} from "../../lib/probation";

const cardClass = "rounded-[14px] border border-border bg-card text-card-foreground";
const sectionTitleClass = "text-[15px] font-semibold tracking-tight text-foreground";

interface ProbationRow {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
  phase: ProbationPhase;
  daysLeft: number | null;
}

interface ResignationRow {
  _id: string;
  employeeId?: { firstName?: string; lastName?: string; name?: string; department?: string; avatar?: string };
  resignationDate: string;
  lastWorkingDate: string;
  status: string;
}

interface LifecycleRow {
  key: string;
  name: string;
  avatar?: string;
  meta: string;
  chip: string;
  chipClass: string;
  sortValue: number;
}

const MAX_ROWS = 4;
const OVERDUE_GRACE_DAYS = 30;

/**
 * People leaving the probation window or serving notice. Self-contained so it
 * can sit on the dashboard without widening the stats payload.
 */
export function CareerLifecycleWidget() {
  const [tab, setTab] = useState<"probation" | "notice">("probation");
  const [probation, setProbation] = useState<ProbationRow[]>([]);
  const [notice, setNotice] = useState<LifecycleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [probationRes, resignationRes] = await Promise.all([
          fetch("/api/probation"),
          fetch("/api/resignations"),
        ]);

        const probationData = probationRes.ok ? await probationRes.json() : { employees: [] };
        const resignationData = resignationRes.ok ? await resignationRes.json() : { resignations: [] };

        if (cancelled) return;

        const probationRows: ProbationRow[] = (probationData.employees || [])
          .filter((employee: ProbationRow) => ["active", "due_soon", "overdue"].includes(employee.phase))
          .sort((a: ProbationRow, b: ProbationRow) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

        const noticeRows: LifecycleRow[] = (resignationData.resignations || [])
          .filter((record: ResignationRow) =>
            (RESIGNATION_ACTIVE_STATUSES as readonly string[]).includes(record.status)
          )
          .map((record: ResignationRow) => {
            const info = getNoticeInfo({
              noticeStart: record.resignationDate,
              lastWorkingDate: record.lastWorkingDate,
              status: record.status,
              activeStatuses: RESIGNATION_ACTIVE_STATUSES,
            });
            const employee = record.employeeId;
            const name =
              [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") ||
              employee?.name ||
              "Employee";
            return {
              key: record._id,
              name,
              avatar: employee?.avatar,
              meta: `Last day ${new Date(record.lastWorkingDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}`,
              chip: noticeLabel(info),
              chipClass: noticePhaseClasses(info.phase),
              sortValue: info.daysLeft ?? 0,
            };
          })
          .filter((row: LifecycleRow) => row.sortValue >= -OVERDUE_GRACE_DAYS)
          .sort((a: LifecycleRow, b: LifecycleRow) => a.sortValue - b.sortValue);

        setProbation(probationRows);
        setNotice(noticeRows);
      } catch (error) {
        console.error("Failed to load lifecycle widget:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const probationList: LifecycleRow[] = useMemo(
    () =>
      probation.map((employee) => ({
        key: employee.id,
        name: employee.name,
        avatar: employee.avatar,
        meta: employee.department || "On probation",
        chip: probationLabel({ phase: employee.phase, daysLeft: employee.daysLeft }),
        chipClass: probationPhaseClasses(employee.phase),
        sortValue: employee.daysLeft ?? 0,
      })),
    [probation]
  );

  const rows = tab === "probation" ? probationList : notice;
  const counts = { probation: probationList.length, notice: notice.length };

  return (
    <section className={cn(cardClass, "flex min-h-[240px] flex-col p-5")} aria-label="Probation and notice">
      <div className="flex items-center justify-between gap-2">
        <h3 className={sectionTitleClass}>Lifecycle</h3>
        <Link
          href={tab === "probation" ? "/probation" : "/resignations"}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          Open
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-1 border-b border-border/70 pb-2" role="tablist" aria-label="Lifecycle views">
        {(
          [
            { id: "probation", label: `Probation (${counts.probation})`, icon: <CalendarClock size={13} /> },
            { id: "notice", label: `Notice (${counts.notice})`, icon: <LogOut size={13} /> },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => setTab(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              tab === option.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex-1">
        {loading ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-10 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">
            {tab === "probation" ? "No probation windows closing." : "Nobody is serving notice."}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {rows.slice(0, MAX_ROWS).map((row) => (
              <li key={row.key} className="flex items-center gap-2.5 py-2.5">
                <Avatar name={row.name} src={row.avatar} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{row.meta}</p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", row.chipClass)}>
                  {row.chip}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && rows.length > MAX_ROWS && (
        <Link
          href={tab === "probation" ? "/probation" : "/resignations"}
          className="mt-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          +{rows.length - MAX_ROWS} more
        </Link>
      )}
    </section>
  );
}
