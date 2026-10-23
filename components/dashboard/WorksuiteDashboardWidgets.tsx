"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cake,
  Palmtree,
  Calendar as CalendarIcon,
  FolderKanban,
  CheckSquare,
  Clock,
  CheckCircle2,
  Briefcase,
  Home,
  Loader2,
  PartyPopper,
  ChevronDown,
  Ticket,
  ArrowUpRight,
  Award,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Shared quiet card: one radius, one border, no perfumed shadows.
// Hierarchy comes from spacing and rules, not competing card styles.
const cardClass =
  "rounded-[14px] border border-border bg-card text-card-foreground";
const sectionTitleClass =
  "text-[15px] font-semibold tracking-tight text-foreground";
const sectionSubClass = "text-[13px] text-muted-foreground";
const rowClass =
  "flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5";

// ====================================================
// 1. MASTHEAD WITH SHIFT CONTROL & GREETING
// The shift clock is the subject of this product, so the
// tabular time readout is data — the one place mono is earned.
// ====================================================
interface WorksuiteHeaderProps {
  userName: string;
  activeShift: { start: Date; mode: string } | null;
  elapsedTime: string;
  isProcessing: boolean;
  workMode: 'office' | 'wfh';
  setWorkMode: (mode: 'office' | 'wfh') => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onLogout: () => void;
}

export const WorksuiteHeader = ({
  userName,
  activeShift,
  elapsedTime,
  isProcessing,
  workMode,
  setWorkMode,
  onCheckIn,
  onCheckOut,
}: WorksuiteHeaderProps) => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 12) setGreeting("Good morning");
      else if (hours < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDay(
        now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const firstName = userName ? userName.split(" ")[0] : "there";

  return (
    <section className={cn(cardClass, "p-5 sm:p-6")} aria-label="Shift status">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{currentDay}</p>
          <h1 className="font-display mt-1 text-[26px] leading-tight font-medium text-foreground sm:text-[30px]">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {activeShift
              ? `On the clock since ${activeShift.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${activeShift.mode === 'wfh' ? 'remote' : 'office'}).`
              : "You are off the clock. Clock in to start today's record."}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 py-1.5 pr-1.5 pl-4">
          <div className="pr-1 text-right">
            <p className="tabular text-[15px] font-semibold text-foreground">
              {activeShift ? elapsedTime : currentTime || "--:--:--"}
            </p>
            <p className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  activeShift ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              {activeShift ? "On clock" : "Off clock"}
            </p>
          </div>

          {activeShift ? (
            <button
              onClick={onCheckOut}
              disabled={isProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
              Clock out
            </button>
          ) : (
            <div className="relative">
              <div className="flex items-center overflow-hidden rounded-lg">
                <button
                  onClick={onCheckIn}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                  Clock in
                </button>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  aria-expanded={showModeDropdown}
                  aria-label={`Work location: ${workMode === 'office' ? 'office' : 'remote'}. Change location.`}
                  className="flex items-center gap-1 border-l border-primary-foreground/25 bg-primary px-2.5 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {workMode === 'office' ? <Briefcase size={13} /> : <Home size={13} />}
                  <ChevronDown size={12} className={cn("transition-transform", showModeDropdown && "rotate-180")} />
                </button>
              </div>

              {showModeDropdown && (
                <div className="absolute top-full right-0 z-50 mt-2 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                  <p className="px-2.5 py-1 text-xs text-muted-foreground">Work location</p>
                  {(
                    [
                      { id: 'office', label: 'Office', icon: <Briefcase size={14} /> },
                      { id: 'wfh', label: 'Remote', icon: <Home size={14} /> },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setWorkMode(m.id); setShowModeDropdown(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                        workMode === m.id
                          ? "bg-muted font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">{m.icon}{m.label}</span>
                      {workMode === m.id && <CheckCircle2 size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


// ====================================================
// 2. LEDGER STRIP — one ruled strip, not four pastel tiles.
// Structure encodes the numbers; dividers carry the rhythm.
// ====================================================
interface QuickMetricsBarProps {
  tasksPending: number;
  tasksOverdue: number;
  projectsCount: number;
  awayCount: number;
  nextBirthdayText?: string;
}

export const QuickMetricsBar = ({
  tasksPending = 0,
  tasksOverdue = 0,
  projectsCount = 0,
  awayCount = 0,
  nextBirthdayText = "No birthdays this week",
}: QuickMetricsBarProps) => {
  const cells = [
    {
      label: "Tasks pending",
      value: String(tasksPending),
      note: tasksOverdue > 0 ? `${tasksOverdue} overdue` : "All clear",
      alert: tasksOverdue > 0,
      href: "/tasks",
      icon: <CheckSquare size={15} className="text-muted-foreground" />,
    },
    {
      label: "Projects in progress",
      value: String(projectsCount),
      note: "Active portfolio",
      alert: false,
      href: "/my-projects",
      icon: <FolderKanban size={15} className="text-muted-foreground" />,
    },
    {
      label: "Away today",
      value: String(awayCount),
      note: awayCount === 1 ? "1 teammate out" : `${awayCount} teammates out`,
      alert: false,
      href: undefined,
      icon: <Palmtree size={15} className="text-muted-foreground" />,
    },
    {
      label: "Next celebration",
      value: nextBirthdayText,
      note: "Birthdays",
      alert: false,
      href: undefined,
      icon: <Cake size={15} className="text-muted-foreground" />,
      small: true,
    },
  ];

  return (
    <dl className={cn(cardClass, "grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x")}>
      {cells.map((c) => {
        const inner = (
          <div className="flex h-full flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[13px] text-muted-foreground">{c.label}</dt>
              {c.icon}
            </div>
            <div>
              <dd className={cn("tabular truncate text-foreground", c.small ? "text-[15px] font-semibold" : "font-display text-[26px] leading-none font-medium")}>
                {c.value}
              </dd>
              <p className={cn("mt-1 text-xs", c.alert ? "font-medium text-destructive" : "text-muted-foreground")}>
                {c.note}
              </p>
            </div>
          </div>
        );
        return c.href ? (
          <Link key={c.label} href={c.href} className="transition-colors first:rounded-tl-[14px] hover:bg-muted/50">
            {inner}
          </Link>
        ) : (
          <div key={c.label}>{inner}</div>
        );
      })}
    </dl>
  );
};


// ====================================================
// 3. PROFILE CARD
// ====================================================
interface ExecutiveProfileCardProps {
  name: string;
  designation: string;
  employeeId: string;
  department: string;
  avatar?: string;
  openTasksCount: number;
  projectsCount: number;
  workShift?: { name?: string; startTime?: string; endTime?: string } | null;
}

export const ExecutiveProfileCard = ({
  name,
  designation,
  employeeId,
  department,
  avatar,
  openTasksCount = 0,
  projectsCount = 0,
  workShift,
}: ExecutiveProfileCardProps) => {
  return (
    <section className={cn(cardClass, "p-5")} aria-label="Your profile">
      <div className="flex items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0b1220] text-lg font-semibold text-white dark:bg-white dark:text-[#0b1220]" aria-hidden>
            {name?.charAt(0) || "E"}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold tracking-tight text-foreground">{name}</h2>
          <p className="truncate text-[13px] text-muted-foreground">{designation}</p>
          <p className="tabular mt-1 text-xs text-muted-foreground">
            {employeeId || "—"} <span aria-hidden className="mx-1">·</span> {department || "Engineering"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 divide-x divide-border rounded-lg border border-border/70">
        <div className="p-3">
          <p className="text-[13px] text-muted-foreground">Open tasks</p>
          <p className="tabular font-display mt-0.5 text-xl font-medium text-foreground">{openTasksCount}</p>
        </div>
        <div className="p-3">
          <p className="text-[13px] text-muted-foreground">Active projects</p>
          <p className="tabular font-display mt-0.5 text-xl font-medium text-foreground">{projectsCount}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 text-[13px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock size={13} />
          <span className="tabular">{workShift?.startTime || "09:00 AM"} – {workShift?.endTime || "06:00 PM"}</span>
        </span>
        <Link href="/profile" className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          Profile <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
};


// ====================================================
// 4. TEAM PRESENCE (tabs only because the content differs)
// ====================================================
interface TeamRadarProps {
  onLeave?: any[];
  joinings?: any[];
  anniversaries?: any[];
}

export const TeamPresenceHub = ({
  onLeave = [],
  joinings = [],
  anniversaries = [],
}: TeamRadarProps) => {
  const [tab, setTab] = useState<'leave' | 'milestones'>('leave');

  return (
    <section className={cn(cardClass, "flex min-h-[320px] flex-col p-5")} aria-label="Team presence">
      <div className="flex items-center gap-1 border-b border-border/70 pb-3" role="tablist" aria-label="Presence views">
        {(
          [
            { id: 'leave', label: `Away (${onLeave.length})`, icon: <Palmtree size={13} /> },
            { id: 'milestones', label: `Milestones (${joinings.length + anniversaries.length})`, icon: <PartyPopper size={13} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[220px] flex-1 space-y-2 overflow-y-auto py-3">
        {tab === 'leave' ? (
          onLeave.length > 0 ? (
            onLeave.map((item, idx) => (
              <div key={idx} className={rowClass}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground" aria-hidden>
                    {item.name?.charAt(0) || "–"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.designation || item.department}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground">
                  {item.leaveType || 'Leave'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-3 text-left">
              <Palmtree size={24} className="mb-2 text-muted-foreground/50" />
              <p className="text-[13px] text-muted-foreground">Everyone is present today.</p>
            </div>
          )
        ) : (
          (joinings.length > 0 || anniversaries.length > 0) ? (
            <>
              {joinings.map((j, idx) => (
                <div key={`j-${idx}`} className={rowClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground" aria-hidden>
                      {j.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{j.name}</p>
                      <p className="text-xs text-muted-foreground">Joined today</p>
                    </div>
                  </div>
                </div>
              ))}
              {anniversaries.map((a, idx) => (
                <div key={`a-${idx}`} className={rowClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground" aria-hidden>
                      {a.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.years}-year anniversary</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-3 text-left">
              <Award size={24} className="mb-2 text-muted-foreground/50" />
              <p className="text-[13px] text-muted-foreground">No milestones today.</p>
            </div>
          )
        )}
      </div>

      <div className="border-t border-border/70 pt-3 text-right">
        <Link href="/leaves" className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          Leave management <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
};


// ====================================================
// 5. BIRTHDAYS
// ====================================================
interface BirthdaysCardProps {
  birthdays?: any[];
}

export const CelebrationHub = ({ birthdays = [] }: BirthdaysCardProps) => {
  return (
    <section className={cn(cardClass, "p-5")} aria-label="Upcoming birthdays">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <h3 className={sectionTitleClass}>Birthdays</h3>
        <span className="tabular text-xs text-muted-foreground">{birthdays.length} upcoming</span>
      </div>

      <div className="max-h-[220px] space-y-2 overflow-y-auto py-3">
        {birthdays.length > 0 ? (
          birthdays.map((b, idx) => (
            <div key={idx} className={rowClass}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground" aria-hidden>
                  {b.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.designation}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-[13px] font-medium text-foreground">{b.formattedDate}</p>
                <p className="text-xs text-muted-foreground">{b.relativeText}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-3 text-left text-[13px] text-muted-foreground">No birthdays coming up.</p>
        )}
      </div>
    </section>
  );
};


// ====================================================
// 6. SPRINT TASKS
// ====================================================
interface TaskItem {
  id: string;
  taskNumber: string;
  title: string;
  status: string;
  rawStatus?: string;
  priority?: string;
  dueDate?: string;
}

export const SprintTasksBoard = ({ tasks = [] }: { tasks?: TaskItem[] }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    const statusVal = ((t as any).rawStatus || t.status || '').toLowerCase().replace(/[\s_]+/g, '');
    if (filter === 'todo') return ['todo', 'backlog', 'open'].includes(statusVal);
    if (filter === 'doing') return ['doing', 'inprogress', 'inreview'].includes(statusVal);
    if (filter === 'done') return ['done', 'completed', 'finished'].includes(statusVal);
    return true;
  });

  const getStatusBadge = (status: string, rawStatus?: string) => {
    const s = (rawStatus || status || '').toLowerCase().replace(/[\s_]+/g, '');
    if (['done', 'completed'].includes(s)) {
      return <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Done</span>;
    }
    if (['doing', 'inprogress', 'inreview'].includes(s)) {
      return <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">In progress</span>;
    }
    return <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">To do</span>;
  };

  return (
    <section className={cn(cardClass, "flex min-h-[320px] flex-col p-5 sm:p-6")} aria-label="Sprint tasks">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={sectionTitleClass}>Sprint tasks</h3>
          <p className={cn(sectionSubClass, "mt-0.5")}>Your assignments from active sprints</p>
        </div>
        <div className="flex items-center gap-0.5 self-start rounded-lg border border-border bg-muted/40 p-0.5" role="tablist" aria-label="Filter tasks">
          {[
            { id: 'all', label: 'All' },
            { id: 'todo', label: 'To do' },
            { id: 'doing', label: 'In progress' },
            { id: 'done', label: 'Done' },
          ].map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
                filter === f.id ? "bg-card text-foreground shadow-none ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[240px] flex-1 space-y-2 overflow-y-auto py-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id || task.taskNumber} className={cn(rowClass, "transition-colors hover:border-foreground/20")}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="tabular shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {task.taskNumber}
                </span>
                <span className="truncate text-[13px] font-medium text-foreground">{task.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {getStatusBadge(task.status, task.rawStatus)}
                <span className="tabular hidden text-xs text-muted-foreground sm:inline">
                  {task.dueDate || "No due date"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-3 text-left">
            <CheckSquare size={22} className="mb-2 text-muted-foreground/50" />
            <p className="text-[13px] text-muted-foreground">No tasks in this view.</p>
          </div>
        )}
      </div>

      <div className="border-t border-border/70 pt-3 text-right">
        <Link href="/tasks" className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          Open task board <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
};


// ====================================================
// 7. PROJECT PORTFOLIO
// ====================================================
interface ProjectItem {
  id: string;
  name: string;
  status: string;
  progressPercentage?: number;
  deadline?: string;
  budget?: number;
  currency?: string;
  manager?: string;
}

export const ProjectPortfolioGrid = ({ projects = [] }: { projects?: ProjectItem[] }) => {
  return (
    <section className={cn(cardClass, "p-5 sm:p-6")} aria-label="Project portfolio">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className={sectionTitleClass}>Project portfolio</h3>
          <p className={cn(sectionSubClass, "mt-0.5")}>Roadmap progress and milestones</p>
        </div>
        <Link href="/my-projects" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          View all <ArrowUpRight size={13} />
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
          {projects.map((p, idx) => {
            const progress = p.progressPercentage ?? [80, 65, 45, 30][idx % 4];
            return (
              <article key={p.id || idx} className="rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-[13px] font-semibold text-foreground">{p.name}</h4>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">Managed by {p.manager || "Unassigned"}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Active
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="tabular font-semibold text-foreground">{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/70" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="tabular mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                  <span>{p.currency || 'USD'} {(p.budget ?? 15000).toLocaleString()}</span>
                  <span>Due {p.deadline || "Unscheduled"}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="py-4 text-left text-[13px] text-muted-foreground">No active projects right now.</p>
      )}
    </section>
  );
};


// ====================================================
// 8. AGENDA
// ====================================================
export const AgendaScheduleWidget = ({ schedule = [] }: { schedule?: any[] }) => {
  return (
    <section className={cn(cardClass, "p-5")} aria-label="This week's agenda">
      <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
        <CalendarIcon size={15} className="shrink-0 text-muted-foreground" />
        <h3 className={sectionTitleClass}>Agenda</h3>
      </div>
      <div className="space-y-2 py-3">
        {schedule.length > 0 ? (
          schedule.slice(0, 4).map((event, idx) => (
            <div key={idx} className={rowClass}>
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="h-8 w-0.5 shrink-0 rounded-full bg-primary/60" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.type || 'Event'}</p>
                </div>
              </div>
              <span className="tabular shrink-0 text-xs text-muted-foreground">{event.date}</span>
            </div>
          ))
        ) : (
          <p className="py-3 text-left text-[13px] text-muted-foreground">Nothing scheduled this week.</p>
        )}
      </div>
    </section>
  );
};


// ====================================================
// 9. HELPDESK
// ====================================================
export const SupportDeskWidget = ({ tickets = [] }: { tickets?: any[] }) => {
  return (
    <section className={cn(cardClass, "p-5")} aria-label="Helpdesk requests">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <Ticket size={15} className="shrink-0 text-muted-foreground" />
          <h3 className={sectionTitleClass}>Helpdesk</h3>
        </div>
        <Link href="/tickets" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
          Open tickets <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="space-y-2 py-3">
        {tickets.length > 0 ? (
          tickets.map((t, idx) => (
            <div key={idx} className={rowClass}>
              <div className="min-w-0">
                <p className="tabular text-xs text-muted-foreground">{t.ticketNumber}</p>
                <p className="truncate text-[13px] font-medium text-foreground">{t.subject}</p>
              </div>
              <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                {t.status || "Open"}
              </span>
            </div>
          ))
        ) : (
          <p className="py-3 text-left text-[13px] text-muted-foreground">No open requests.</p>
        )}
      </div>
    </section>
  );
};
