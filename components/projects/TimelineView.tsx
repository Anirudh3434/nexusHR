"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  differenceInCalendarDays,
  startOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isWeekend,
  isSameDay,
} from "date-fns";
import {
  ChevronRight,
  ChevronDown,
  Flag,
  Users,
  Layers,
  AlignLeft,
  Crosshair,
  Route,
  CalendarDays,
  Info,
} from "lucide-react";

export interface TimelineTaskRef {
  _id: string;
  taskNumber: string;
  title: string;
  status: string;
}

export interface TimelineTask {
  _id: string;
  taskNumber: string;
  title: string;
  status: string;
  priority?: string;
  taskType?: string;
  startDate?: string | null;
  dueDate?: string | null;
  progressPercentage?: number;
  assignedTo?: Array<{ _id: string; name: string }>;
  dependsOn?: TimelineTaskRef[];
  parentId?: TimelineTaskRef | string | null;
  sprintId?: { _id: string; name: string } | string | null;
  customStatus?: { id?: string; name: string; color?: string };
}

export interface TimelineMilestone {
  id: string;
  name: string;
  dueDate: string;
  status?: string;
}

export interface TimelineViewProps {
  tasks: TimelineTask[];
  milestones?: TimelineMilestone[];
  projectStart?: string | null;
  projectEnd?: string | null;
  canEdit?: boolean;
  onOpenTask: (taskId: string) => void;
  onUpdateDates: (
    taskId: string,
    dates: { startDate: string | null; dueDate: string | null },
  ) => Promise<void> | void;
}

type Zoom = "day" | "week" | "month" | "quarter";
type GroupBy = "none" | "status" | "assignee" | "sprint";

const ZOOMS: Record<Zoom, { px: number; label: string; padDays: number }> = {
  day: { px: 40, label: "Day", padDays: 7 },
  week: { px: 18, label: "Week", padDays: 14 },
  month: { px: 7, label: "Month", padDays: 31 },
  quarter: { px: 3, label: "Quarter", padDays: 92 },
};

const STATUS_ORDER = ["backlog", "to_do", "in_progress", "in_review", "completed", "cancelled"];
const STATUS_HEX: Record<string, string> = {
  backlog: "#94a3b8",
  to_do: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  to_do: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

const LEFT_W = 300;
const ROW_H = 40;
const GROUP_H = 34;
const BAND_H = 28;
const HEADER_H = BAND_H * 2;

const statusHex = (t: TimelineTask) => t.customStatus?.color || STATUS_HEX[t.status] || "#64748b";
const statusLabel = (t: TimelineTask) =>
  t.customStatus?.name || STATUS_LABEL[t.status] || t.status;

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface DragState {
  taskId: string;
  mode: "move" | "resize-start" | "resize-end";
  startX: number;
  origStartDay: number;
  origEndDay: number;
  delta: number;
}

export default function TimelineView({
  tasks,
  milestones = [],
  projectStart,
  projectEnd,
  canEdit = false,
  onOpenTask,
  onUpdateDates,
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showCritical, setShowCritical] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<{ task: TimelineTask; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

  const px = ZOOMS[zoom].px;
  const today = startOfDay(new Date());

  const visibleTasks = useMemo(
    () => (showCompleted ? tasks : tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")),
    [tasks, showCompleted],
  );

  const { rangeStart, totalDays } = useMemo(() => {
    const stamps: number[] = [];
    visibleTasks.forEach((t) => {
      if (t.startDate) stamps.push(+new Date(t.startDate));
      if (t.dueDate) stamps.push(+new Date(t.dueDate));
    });
    milestones.forEach((m) => m.dueDate && stamps.push(+new Date(m.dueDate)));
    if (projectStart) stamps.push(+new Date(projectStart));
    if (projectEnd) stamps.push(+new Date(projectEnd));

    let minD: Date;
    let maxD: Date;
    if (stamps.length) {
      minD = startOfDay(new Date(Math.min(...stamps)));
      maxD = startOfDay(new Date(Math.max(...stamps)));
    } else {
      minD = addDays(today, -7);
      maxD = addDays(today, 30);
    }
    const pad = ZOOMS[zoom].padDays;
    let rs = startOfWeek(addDays(minD, -pad), { weekStartsOn: 1 });
    let re = endOfWeek(addDays(maxD, pad), { weekStartsOn: 1 });
    if (today < rs) rs = startOfWeek(addDays(today, -3), { weekStartsOn: 1 });
    if (today > re) re = endOfWeek(addDays(today, 10), { weekStartsOn: 1 });
    const days = differenceInCalendarDays(re, rs) + 1;
    return { rangeStart: rs, rangeEnd: re, totalDays: days };
  }, [visibleTasks, milestones, projectStart, projectEnd, zoom, today]);

  const totalWidth = totalDays * px;
  const xFor = useCallback(
    (d: Date) => differenceInCalendarDays(startOfDay(d), rangeStart) * px,
    [rangeStart, px],
  );

  const dayArray = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, totalDays],
  );

  const monthBands = useMemo(() => {
    const bands: Array<{ key: string; label: string; days: number }> = [];
    dayArray.forEach((d) => {
      const key = format(d, "yyyy-MM");
      const last = bands[bands.length - 1];
      if (last && last.key === key) last.days += 1;
      else bands.push({ key, label: format(d, "MMMM yyyy"), days: 1 });
    });
    return bands;
  }, [dayArray]);

  const tasksById = useMemo(() => {
    const m: Record<string, TimelineTask> = {};
    visibleTasks.forEach((t) => (m[t._id] = t));
    return m;
  }, [visibleTasks]);

  const criticalPath = useMemo(() => {
    if (!showCritical) return null;
    return computeCriticalPath(tasksById);
  }, [showCritical, tasksById]);

  const geometry = useCallback(
    (t: TimelineTask) => {
      const s = t.startDate ? startOfDay(new Date(t.startDate)) : null;
      const e = t.dueDate ? startOfDay(new Date(t.dueDate)) : null;
      if (!s && !e) return null;
      const startD = s ?? e!;
      const endD = e ?? s!;
      const x0 = differenceInCalendarDays(startD, rangeStart) * px;
      const days = differenceInCalendarDays(endD, startD) + 1;
      return { x0, width: Math.max(days * px, px), startD, endD, point: !s || !e };
    },
    [rangeStart, px],
  );

  // ---- grouping / rows -------------------------------------------------
  interface Row {
    kind: "group" | "task" | "unscheduled";
    key: string;
    label?: string;
    color?: string;
    count?: number;
    task?: TimelineTask;
    depth?: number;
    hasChildren?: boolean;
    parentKey?: string;
  }

  const groupRank = useMemo(() => {
    const rank = new Map<string, { label: string; color: string; order: number }>();
    visibleTasks.forEach((t) => {
      let key: string;
      let label: string;
      let color: string;
      let order: number;
      if (groupBy === "status") {
        key = t.customStatus?.name || t.status;
        label = statusLabel(t);
        color = statusHex(t);
        order = STATUS_ORDER.indexOf(t.status) === -1 ? 99 : STATUS_ORDER.indexOf(t.status);
      } else if (groupBy === "assignee") {
        const a = t.assignedTo?.[0];
        key = a?._id || "unassigned";
        label = a?.name || "Unassigned";
        color = "#64748b";
        order = a ? 1 : 99;
      } else if (groupBy === "sprint") {
        const sp = t.sprintId;
        const sid = typeof sp === "object" && sp ? sp._id : (sp as string | undefined);
        key = sid || "no-sprint";
        label = typeof sp === "object" && sp ? sp.name : "No sprint";
        color = "#6366f1";
        order = sid ? 1 : 99;
      } else {
        key = "all";
        label = "All tasks";
        color = "#6366f1";
        order = 0;
      }
      if (!rank.has(key)) rank.set(key, { label, color, order });
    });
    return rank;
  }, [visibleTasks, groupBy]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const scheduled = visibleTasks.filter((t) => t.startDate || t.dueDate);
    const unscheduled = visibleTasks.filter((t) => !t.startDate && !t.dueDate);

    const childrenOf = (parentId: string) =>
      scheduled.filter((t) => {
        const pid = typeof t.parentId === "object" && t.parentId ? t.parentId._id : t.parentId;
        return pid === parentId;
      });
    const hasParentInList = (t: TimelineTask) => {
      const pid = typeof t.parentId === "object" && t.parentId ? t.parentId._id : t.parentId;
      return !!pid && scheduled.some((s) => s._id === pid);
    };

    const pushTask = (t: TimelineTask, depth: number, groupKey: string) => {
      const kids = childrenOf(t._id);
      const rowKey = `task:${t._id}`;
      out.push({
        kind: "task",
        key: rowKey,
        task: t,
        depth,
        hasChildren: kids.length > 0,
        parentKey: groupKey,
      });
      if (kids.length && !collapsed.has(rowKey)) {
        kids
          .sort((a, b) => +new Date(a.startDate || 0) - +new Date(b.startDate || 0))
          .forEach((k) => pushTask(k, depth + 1, groupKey));
      }
    };

    const groups = new Map<string, TimelineTask[]>();
    scheduled.forEach((t) => {
      let key = "all";
      if (groupBy === "status") key = t.customStatus?.name || t.status;
      else if (groupBy === "assignee") key = t.assignedTo?.[0]?._id || "unassigned";
      else if (groupBy === "sprint") {
        const sp = t.sprintId;
        key = (typeof sp === "object" && sp ? sp._id : (sp as string | undefined)) || "no-sprint";
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });

    const orderedKeys = [...groups.keys()].sort((a, b) => {
      const ra = groupRank.get(a)?.order ?? 50;
      const rb = groupRank.get(b)?.order ?? 50;
      if (ra !== rb) return ra - rb;
      return (groupRank.get(a)?.label || a).localeCompare(groupRank.get(b)?.label || b);
    });

    orderedKeys.forEach((key) => {
      const list = groups.get(key)!;
      const groupKey = `group:${key}`;
      if (groupBy !== "none") {
        out.push({
          kind: "group",
          key: groupKey,
          label: groupRank.get(key)?.label || key,
          color: groupRank.get(key)?.color,
          count: list.length,
        });
      }
      if (groupBy !== "none" && collapsed.has(groupKey)) return;
      list
        .filter((t) => !hasParentInList(t))
        .sort((a, b) => +new Date(a.startDate || a.dueDate || 0) - +new Date(b.startDate || b.dueDate || 0))
        .forEach((t) => pushTask(t, 0, groupKey));
    });

    if (unscheduled.length) {
      out.push({ kind: "group", key: "group:unscheduled", label: "Not scheduled", color: "#94a3b8", count: unscheduled.length });
      if (!collapsed.has("group:unscheduled")) {
        unscheduled.forEach((t) => out.push({ kind: "unscheduled", key: `task:${t._id}`, task: t, depth: 0 }));
      }
    }
    return out;
  }, [visibleTasks, groupBy, groupRank, collapsed]);

  // Row vertical offsets
  const rowTops = useMemo(() => {
    let y = 0;
    const map: number[] = [];
    rows.forEach((r) => {
      map.push(y);
      y += r.kind === "group" ? GROUP_H : ROW_H;
    });
    return { tops: map, bodyHeight: y };
  }, [rows]);

  const rowCenter = useCallback(
    (taskId: string) => {
      const idx = rows.findIndex((r) => r.task?._id === taskId);
      if (idx === -1) return null;
      return rowTops.tops[idx] + ROW_H / 2;
    },
    [rows, rowTops],
  );

  const todayX = xFor(today);

  // ---- drag handlers ---------------------------------------------------
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = Math.round((e.clientX - d.startX) / px);
      const next = { ...d, delta };
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      movedRef.current = d.delta !== 0;
      if (d.delta === 0) return;
      const task = tasksById[d.taskId];
      if (!task) return;
      let startDay = d.origStartDay;
      let endDay = d.origEndDay;
      if (d.mode === "move") {
        startDay += d.delta;
        endDay += d.delta;
      } else if (d.mode === "resize-start") {
        startDay = Math.min(startDay + d.delta, endDay);
      } else {
        endDay = Math.max(endDay + d.delta, startDay);
      }
      const startIso = format(addDays(rangeStart, startDay), "yyyy-MM-dd");
      const endIso = format(addDays(rangeStart, endDay), "yyyy-MM-dd");
      const payload = {
        startDate: startIso,
        dueDate: endIso,
      };
      if (payload.startDate === fmt(task.startDate) && payload.dueDate === fmt(task.dueDate)) return;
      onUpdateDates(d.taskId, payload);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, px, tasksById, rangeStart, onUpdateDates]);

  const startDrag = (
    e: React.PointerEvent,
    task: TimelineTask,
    mode: DragState["mode"],
    geo: { startD: Date; endD: Date },
  ) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    movedRef.current = false;
    const d: DragState = {
      taskId: task._id,
      mode,
      startX: e.clientX,
      origStartDay: differenceInCalendarDays(geo.startD, rangeStart),
      origEndDay: differenceInCalendarDays(geo.endD, rangeStart),
      delta: 0,
    };
    dragRef.current = d;
    setDrag(d);
  };

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, todayX - el.clientWidth / 2), behavior: "smooth" });
  }, [todayX]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && todayX > 0) {
      el.scrollLeft = Math.max(0, todayX - el.clientWidth / 2);
    }
    // only on mount / when zoom changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const dragOffset = drag ? drag.delta * px : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  zoom === z
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                {ZOOMS[z].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
            >
              <option value="none">No grouping</option>
              <option value="status">Group: Status</option>
              <option value="assignee">Group: Assignee</option>
              <option value="sprint">Group: Sprint</option>
            </select>
          </div>

          <button
            onClick={() => setShowCritical((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              showCritical
                ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                : "border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400"
            }`}
            title="Highlight the longest chain of dependent tasks"
          >
            <Route className="h-3.5 w-3.5" />
            Critical path
          </button>

          <button
            onClick={() => setShowCompleted((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              showCompleted
                ? "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
                : "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
            }`}
            title="Toggle completed and cancelled tasks"
          >
            {showCompleted ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {showCompleted ? "Hiding nothing" : "Completed hidden"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {STATUS_ORDER.slice(0, 5).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_HEX[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <button
            onClick={scrollToToday}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Today
          </button>
        </div>
      </div>

      {/* Chart grid */}
      <div ref={scrollRef} className="relative max-h-[72vh] overflow-auto">
        <div className="relative" style={{ width: LEFT_W + totalWidth, minWidth: "100%" }}>
          {/* Header */}
          <div className="sticky top-0 z-30 flex" style={{ height: HEADER_H }}>
            <div
              className="sticky left-0 z-40 flex shrink-0 items-end border-b border-r border-slate-200 bg-white px-3 pb-1.5 dark:border-slate-700 dark:bg-slate-900"
              style={{ width: LEFT_W }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="relative" style={{ width: totalWidth }}>
              {/* month band */}
              <div className="flex border-b border-slate-100 dark:border-slate-800" style={{ height: BAND_H }}>
                {monthBands.map((b) => (
                  <div
                    key={b.key}
                    className="flex items-center overflow-hidden whitespace-nowrap border-r border-slate-100 px-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400"
                    style={{ width: b.days * px }}
                  >
                    {b.days * px > 44 ? b.label : ""}
                  </div>
                ))}
              </div>
              {/* day band */}
              <div className="flex border-b border-slate-200 dark:border-slate-700" style={{ height: BAND_H }}>
                {dayArray.map((d, i) => {
                  const wknd = isWeekend(d);
                  const isToday = isSameDay(d, today);
                  const labelDay = zoom === "day" || d.getDate() === 1 || d.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center border-r text-[10px] ${
                        wknd ? "bg-slate-50 dark:bg-slate-800/40" : ""
                      } ${isToday ? "bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" : "text-slate-400"} ${
                        d.getDate() === 1 ? "border-slate-200 dark:border-slate-700" : "border-slate-100 dark:border-slate-800"
                      }`}
                      style={{ width: px }}
                    >
                      {px >= 16 && labelDay ? (zoom === "day" ? d.getDate() : format(d, "d")) : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative flex">
            {/* left pane */}
            <div className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" style={{ width: LEFT_W }}>
              {rows.map((r, idx) => {
                if (r.kind === "group") {
                  const isCollapsed = collapsed.has(r.key);
                  return (
                    <button
                      key={r.key + idx}
                      onClick={() => toggle(r.key)}
                      className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 text-left dark:border-slate-800 dark:bg-slate-800/40"
                      style={{ height: GROUP_H }}
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{r.label}</span>
                      <span className="ml-auto text-[11px] font-medium text-slate-400">{r.count}</span>
                    </button>
                  );
                }
                const t = r.task!;
                const geo = geometry(t);
                const isCollapsed = collapsed.has(r.key);
                return (
                  <div
                    key={r.key + idx}
                    className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800"
                    style={{ height: ROW_H, paddingLeft: 12 + (r.depth || 0) * 16 }}
                  >
                    <button
                      onClick={() => r.hasChildren && toggle(r.key)}
                      className={`shrink-0 ${r.hasChildren ? "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" : "invisible"}`}
                      tabIndex={r.hasChildren ? 0 : -1}
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusHex(t) }} />
                    <button
                      onClick={() => onOpenTask(t._id)}
                      className="min-w-0 flex-1 text-left"
                      title={t.title}
                    >
                      <span className="block truncate text-xs font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400">
                        {t.title}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {geo ? dateRangeLabel(geo.startD, geo.endD) : "Not scheduled"}
                      </span>
                    </button>
                    {t.assignedTo?.[0] && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white"
                        title={t.assignedTo[0].name}
                      >
                        {initials(t.assignedTo[0].name)}
                      </span>
                    )}
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="flex h-24 items-center justify-center px-4 text-center text-xs text-slate-400">
                  No tasks to display.
                </div>
              )}
            </div>

            {/* right pane */}
            <div className="relative" style={{ width: totalWidth }}>
              {/* grid background */}
              <div className="pointer-events-none absolute inset-0">
                {dayArray.map((d, i) =>
                  isWeekend(d) ? (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 bg-slate-50/70 dark:bg-slate-800/30"
                      style={{ left: i * px, width: px }}
                    />
                  ) : null,
                )}
                {todayX >= 0 && todayX <= totalWidth && (
                  <div className="absolute top-0 bottom-0 z-10 w-px bg-indigo-500" style={{ left: todayX }} />
                )}
              </div>

              {rows.map((r, idx) => {
                if (r.kind === "group") {
                  return (
                    <div
                      key={r.key + idx}
                      className="border-b border-slate-100 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-800/20"
                      style={{ height: GROUP_H }}
                    />
                  );
                }
                const t = r.task!;
                const geo = geometry(t);
                return (
                  <div
                    key={r.key + idx}
                    className="relative border-b border-slate-100 dark:border-slate-800"
                    style={{ height: ROW_H }}
                  >
                    {r.kind === "unscheduled" && (
                      <button
                        onClick={() => onOpenTask(t._id)}
                        className="absolute top-1/2 ml-3 -translate-y-1/2 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-600"
                      >
                        Set dates
                      </button>
                    )}
                    {geo &&
                      (() => {
                        const isDrag = drag?.taskId === t._id;
                        let left = geo.x0;
                        let width = geo.width;
                        if (isDrag && drag) {
                          if (drag.mode === "move") left += dragOffset;
                          else if (drag.mode === "resize-start") {
                            left += dragOffset;
                            width = Math.max(px, width - dragOffset);
                          } else {
                            width = Math.max(px, width + dragOffset);
                          }
                        }
                        const color = statusHex(t);
                        const onCritical = criticalPath?.has(t._id);
                        const progress = Math.max(0, Math.min(100, t.progressPercentage || 0));
                        const conflict = hasConflict(t, tasksById);
                        return (
                          <div
                            className={`group absolute top-1/2 -translate-y-1/2 rounded-md ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
                              isDrag ? "z-30 shadow-lg" : ""
                            }`}
                            style={{
                              left,
                              width,
                              height: 22,
                              background: hexToRgba(color, 0.28),
                              border: `1px solid ${color}`,
                              boxShadow: onCritical ? `0 0 0 2px ${hexToRgba("#ef4444", 0.55)}` : undefined,
                              outline: conflict ? "1.5px dashed #f97316" : undefined,
                            }}
                            onPointerDown={(e) => startDrag(e, t, "move", geo)}
                            onClick={() => {
                              if (movedRef.current) {
                                movedRef.current = false;
                                return;
                              }
                              if (!drag) onOpenTask(t._id);
                            }}
                            onMouseEnter={(e) => setHover({ task: t, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHover(null)}
                            title={t.title}
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded-l-md"
                              style={{ width: `${progress}%`, background: hexToRgba(color, 0.65) }}
                            />
                            {canEdit && (
                              <>
                                <span
                                  className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
                                  onPointerDown={(e) => startDrag(e, t, "resize-start", geo)}
                                />
                                <span
                                  className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
                                  onPointerDown={(e) => startDrag(e, t, "resize-end", geo)}
                                />
                              </>
                            )}
                            {width > 70 && (
                              <span className="pointer-events-none relative z-10 flex h-full items-center gap-1 px-2 text-[10px] font-semibold text-slate-700 dark:text-slate-100">
                                <span className="truncate">{t.title}</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* dependency arrows overlay */}
          <svg
            className="pointer-events-none absolute z-10"
            style={{ left: LEFT_W, top: HEADER_H, width: totalWidth, height: rowTops.bodyHeight }}
          >
            <defs>
              <marker id="tl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
              <marker id="tl-arrow-conflict" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
              </marker>
            </defs>
            {visibleTasks.map((t) => {
              const geo = geometry(t);
              if (!geo || !t.dependsOn?.length) return null;
              const y2 = rowCenter(t._id);
              if (y2 == null) return null;
              return t.dependsOn.map((dep) => {
                const dGeo = geometry(tasksById[dep._id]);
                const y1 = rowCenter(dep._id);
                if (!dGeo || y1 == null) return null;
                const x1 = dGeo.x0 + dGeo.width;
                const x2 = geo.x0;
                const midX = x1 + Math.max(10, (x2 - x1) / 2);
                const conflict = hasConflict(t, tasksById);
                const stroke = conflict ? "#f97316" : "#94a3b8";
                return (
                  <path
                    key={`${dep._id}-${t._id}`}
                    d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2 - 5}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    markerEnd={`url(#${conflict ? "tl-arrow-conflict" : "tl-arrow"})`}
                  />
                );
              });
            })}
            {/* milestone markers overlay */}
            {milestones.map((m) => {
              if (!m.dueDate) return null;
              const x = xFor(new Date(m.dueDate));
              return (
                <g key={m.id} transform={`translate(${x}, 8)`}>
                  <path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill="#6366f1" />
                  <text x={16} y={10} className="fill-slate-500" style={{ fontSize: 10, fontWeight: 600 }}>
                    {m.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* milestones legend */}
      {milestones.length > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Flag className="h-3.5 w-3.5 text-indigo-500" />
          {milestones.length} milestone{milestones.length === 1 ? "" : "s"} on this timeline
        </div>
      )}

      {/* hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 280), top: hover.y + 14 }}
        >
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
            <span className="h-2 w-2 rounded-full" style={{ background: statusHex(hover.task) }} />
            {hover.task.taskNumber}
          </p>
          <p className="mb-2 line-clamp-2 text-slate-600 dark:text-slate-300">{hover.task.title}</p>
          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Dates</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {hover.task.startDate && !hover.task.dueDate
                  ? `starts ${format(new Date(hover.task.startDate), "MMM d")}`
                  : hover.task.dueDate && !hover.task.startDate
                    ? `due ${format(new Date(hover.task.dueDate), "MMM d")}`
                    : hover.task.startDate && hover.task.dueDate
                      ? `${format(new Date(hover.task.startDate), "MMM d")} – ${format(new Date(hover.task.dueDate), "MMM d")}`
                      : "—"}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Status</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{statusLabel(hover.task)}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-1"><AlignLeft className="h-3 w-3" /> Progress</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{Math.round(hover.task.progressPercentage || 0)}%</span>
            </p>
            {hover.task.assignedTo?.[0] && (
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Assignee</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{hover.task.assignedTo[0].name}</span>
              </p>
            )}
          </div>
          <p className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 dark:border-slate-800">
            Click to open{canEdit ? " · drag to reschedule" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function fmt(d?: string | null) {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd");
}

function dateRangeLabel(a: Date, b: Date) {
  if (isSameDay(a, b)) return format(a, "MMM d");
  return `${format(a, "MMM d")} – ${format(b, "MMM d")}`;
}

function hasConflict(task: TimelineTask, byId: Record<string, TimelineTask>) {
  if (!task.startDate || !task.dependsOn?.length) return false;
  const start = +new Date(task.startDate);
  return task.dependsOn.some((dep) => {
    const d = byId[dep._id];
    return !!d?.dueDate && +new Date(d.dueDate) > start;
  });
}

/**
 * Critical path via forward/backward pass over finish-to-start dependencies.
 * Returns null if the graph has a cycle (so we never draw a bogus path).
 */
function computeCriticalPath(byId: Record<string, TimelineTask>): Set<string> | null {
  const duration = (t: TimelineTask) => {
    if (t.startDate && t.dueDate) {
      return Math.max(1, differenceInCalendarDays(new Date(t.dueDate), new Date(t.startDate)) + 1);
    }
    return 1;
  };
  const ES: Record<string, number> = {};
  const EF: Record<string, number> = {};
  const state: Record<string, 0 | 1 | 2> = {};
  const order: string[] = [];
  let cycle = false;

  const visit = (id: string) => {
    if (state[id] === 2) return;
    if (state[id] === 1) {
      cycle = true;
      return;
    }
    state[id] = 1;
    const t = byId[id];
    let es = 0;
    (t.dependsOn || []).forEach((p) => {
      if (!byId[p._id]) return;
      visit(p._id);
      es = Math.max(es, EF[p._id] ?? 0);
    });
    ES[id] = es;
    EF[id] = es + duration(t);
    state[id] = 2;
    order.push(id);
  };

  Object.keys(byId).forEach(visit);
  if (cycle) return null;

  const projectEnd = Math.max(0, ...Object.values(EF));
  const succ: Record<string, string[]> = {};
  Object.keys(byId).forEach((id) => {
    (byId[id].dependsOn || []).forEach((p) => {
      if (!byId[p._id]) return;
      (succ[p._id] = succ[p._id] || []).push(id);
    });
  });

  const LS: Record<string, number> = {};
  [...order].reverse().forEach((id) => {
    const ss = succ[id] || [];
    const lf = ss.length ? Math.min(...ss.map((s) => LS[s])) : projectEnd;
    LS[id] = lf - duration(byId[id]);
  });

  const critical = new Set<string>();
  Object.keys(byId).forEach((id) => {
    if ((LS[id] ?? 0) - (ES[id] ?? 0) <= 0) critical.add(id);
  });
  return critical;
}
