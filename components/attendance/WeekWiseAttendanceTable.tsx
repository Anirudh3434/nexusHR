"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  CalendarDays,
  Edit2,
  Timer,
  LayoutGrid,
  ListFilter
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent } from "../ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/Table";
import { AttendanceRecord } from "../../services/attendanceService";
import { Employee } from "../../services/employeeService";

interface WeekWiseAttendanceTableProps {
  attendance: AttendanceRecord[];
  employees?: Employee[];
  isAdminOrHr: boolean;
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onEditRecord?: (record: AttendanceRecord) => void;
}

// Get Monday of the week for any given date
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Normalize date to "YYYY-MM-DD"
const toDateKey = (dateVal: string | Date | undefined): string => {
  if (!dateVal) return "";
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    return dateVal.slice(0, 10);
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format hour string (e.g. 8.5 -> "8h 30m" or "8.5h")
const formatHoursDisplay = (hours?: number): string => {
  if (hours === undefined || hours === null || isNaN(hours) || hours <= 0) return "-";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Calculate hours between two time strings "HH:mm"
const calculateHoursBetween = (inTime?: string, outTime?: string): number => {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);
  if (isNaN(inH) || isNaN(outH)) return 0;
  let mins = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
};

export const WeekWiseAttendanceTable: React.FC<WeekWiseAttendanceTableProps> = ({
  attendance,
  employees = [],
  isAdminOrHr,
  currentUser,
  onEditRecord,
}) => {
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [isCompactView, setIsCompactView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 7 days of the currently selected week (Monday to Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + i);
      const todayStr = toDateKey(new Date());
      const dateKey = toDateKey(d);
      return {
        date: d,
        dateKey,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue...
        dayFullName: d.toLocaleDateString("en-US", { weekday: "long" }),
        formatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: dateKey === todayStr,
        isPast: dateKey < todayStr,
        isFuture: dateKey > todayStr,
      };
    });
  }, [currentWeekMonday]);

  // Week range label e.g. "Nov 02 – Nov 08, 2026"
  const weekLabel = useMemo(() => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    if (sameYear) {
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [weekDays]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(next.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleThisWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  // Map of dateKey -> Map of employeeId -> AttendanceRecord
  const attendanceLookup = useMemo(() => {
    const lookup: Record<string, Record<string, AttendanceRecord>> = {};
    attendance.forEach((rec) => {
      const dateKey = toDateKey(rec.date);
      if (!dateKey) return;
      if (!lookup[dateKey]) lookup[dateKey] = {};
      
      const empId = rec.employeeId;
      if (empId) {
        lookup[dateKey][empId] = rec;
      }
    });
    return lookup;
  }, [attendance]);

  // Extract distinct employees
  const distinctEmployees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department?: string; designation?: string; avatar?: string }>();

    employees.forEach((emp) => {
      if (emp.id) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name || "Unknown",
          department: emp.department || "General",
          designation: emp.designation || "",
          avatar: emp.avatar,
        });
      }
    });

    attendance.forEach((rec) => {
      if (rec.employeeId && !map.has(rec.employeeId)) {
        map.set(rec.employeeId, {
          id: rec.employeeId,
          name: rec.employeeName || "Unknown",
          department: (rec as any).department || "General",
          designation: (rec as any).designation || "",
        });
      }
    });

    if (map.size === 0 && currentUser?.id) {
      map.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name || "You",
        department: "General",
      });
    }

    return Array.from(map.values());
  }, [employees, attendance, currentUser]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    distinctEmployees.forEach((emp) => {
      if (emp.department && emp.department.trim()) set.add(emp.department.trim());
    });
    return Array.from(set).sort();
  }, [distinctEmployees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return distinctEmployees.filter((emp) => {
      const matchesSearch =
        !searchQuery ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept =
        selectedDepartment === "all" ||
        (emp.department && emp.department.toLowerCase() === selectedDepartment.toLowerCase());

      if (!matchesSearch || !matchesDept) return false;

      if (selectedStatusFilter !== "all") {
        const recordsThisWeek = weekDays
          .map((day) => attendanceLookup[day.dateKey]?.[emp.id])
          .filter(Boolean);

        if (selectedStatusFilter === "late") {
          const hasLate = recordsThisWeek.some((r) => r.isLate || r.status === "Late");
          if (!hasLate) return false;
        } else if (selectedStatusFilter === "overtime") {
          const hasOT = recordsThisWeek.some((r) => Boolean(r.isOvertime || (r.overtimeHours && r.overtimeHours > 0)));
          if (!hasOT) return false;
        } else if (selectedStatusFilter === "perfect") {
          const pastWorkdays = weekDays.filter((d) => !d.isWeekend && d.isPast).length;
          const presentCount = recordsThisWeek.filter((r) => r.status === "Present" || r.status === "On Time").length;
          if (pastWorkdays === 0 || presentCount < pastWorkdays) return false;
        }
      }

      return true;
    });
  }, [distinctEmployees, searchQuery, selectedDepartment, selectedStatusFilter, weekDays, attendanceLookup]);

  // Reset pagination when filter/search/week changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, selectedStatusFilter, currentWeekMonday]);

  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  // Weekly KPIs
  const weeklyKPIs = useMemo(() => {
    let totalLogs = 0;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let totalHoursLogged = 0;
    let totalOvertimeHours = 0;

    weekDays.forEach((day) => {
      const dayRecords = attendanceLookup[day.dateKey];
      if (dayRecords) {
        Object.values(dayRecords).forEach((rec) => {
          totalLogs++;
          if (rec.status === "Present" || rec.status === "On Time") presentCount++;
          if (rec.status === "Late" || rec.isLate) lateCount++;
          if (rec.status === "Half Day") halfDayCount++;

          const inT = typeof rec.checkIn === "object" ? rec.checkIn?.time : rec.checkIn;
          const outT = typeof rec.checkOut === "object" ? rec.checkOut?.time : rec.checkOut;
          totalHoursLogged += rec.totalHours || calculateHoursBetween(inT, outT);

          if (rec.overtimeHours && rec.overtimeHours > 0) {
            totalOvertimeHours += rec.overtimeHours;
          }
        });
      }
    });

    const onTimeRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0;

    return {
      totalLogs,
      presentCount,
      lateCount,
      halfDayCount,
      totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      onTimeRate,
    };
  }, [weekDays, attendanceLookup]);

  // Day summary calculations for footer row
  const daySummaries = useMemo(() => {
    return weekDays.map((day) => {
      let present = 0;
      let late = 0;
      let totalHrs = 0;
      const dayRecords = attendanceLookup[day.dateKey] || {};

      Object.values(dayRecords).forEach((rec) => {
        if (rec.status === "Present" || rec.status === "On Time") present++;
        if (rec.status === "Late" || rec.isLate) late++;
        const inT = typeof rec.checkIn === "object" ? rec.checkIn?.time : rec.checkIn;
        const outT = typeof rec.checkOut === "object" ? rec.checkOut?.time : rec.checkOut;
        totalHrs += rec.totalHours || calculateHoursBetween(inT, outT);
      });

      return {
        present,
        late,
        totalHrs: Math.round(totalHrs * 10) / 10,
        totalCheckedIn: Object.keys(dayRecords).length,
      };
    });
  }, [weekDays, attendanceLookup]);

  // Export Weekly CSV
  const handleExportWeekCSV = () => {
    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Designation",
      ...weekDays.map((d) => `${d.dayName} (${d.dateKey})`),
      "Days Present",
      "Days Late",
      "Total Hours",
      "Overtime Hours",
    ];

    const rows = filteredEmployees.map((emp) => {
      let daysPresent = 0;
      let daysLate = 0;
      let totalHours = 0;
      let otHours = 0;

      const dayCells = weekDays.map((day) => {
        const rec = attendanceLookup[day.dateKey]?.[emp.id];
        if (!rec) {
          return day.isWeekend ? "Weekend" : day.isPast ? "Absent" : "-";
        }
        if (rec.status === "Present" || rec.status === "On Time") daysPresent++;
        if (rec.status === "Late" || rec.isLate) daysLate++;

        const inT = typeof rec.checkIn === "object" ? rec.checkIn?.time : rec.checkIn || "";
        const outT = typeof rec.checkOut === "object" ? rec.checkOut?.time : rec.checkOut || "";
        const hrs = rec.totalHours || calculateHoursBetween(inT, outT);
        totalHours += hrs;
        if (rec.overtimeHours && rec.overtimeHours > 0) otHours += rec.overtimeHours;

        const lateLabel = rec.isLate || rec.status === "Late" ? " [Late]" : "";
        const otLabel = Boolean(rec.isOvertime && rec.overtimeHours && rec.overtimeHours > 0)
          ? ` [+${rec.overtimeHours}h OT]`
          : "";
        const editLabel = rec.isEdited ? ` [Edited by ${rec.editedByName || "Admin"}]` : "";
        return `${rec.status || "Present"}${lateLabel} (${hrs}h) ${inT}-${outT}${otLabel}${editLabel}`.trim();
      });

      return [
        emp.id,
        emp.name,
        emp.department || "",
        emp.designation || "",
        ...dayCells,
        daysPresent,
        daysLate,
        Math.round(totalHours * 10) / 10,
        Math.round(otHours * 10) / 10,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `week_attendance_${weekDays[0].dateKey}_to_${weekDays[6].dateKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render individual day cell for a matrix row (clean, uncluttered design)
  const renderDayCell = (day: typeof weekDays[0], empId: string) => {
    const record = attendanceLookup[day.dateKey]?.[empId];

    // Empty cell states
    if (!record) {
      if (day.isWeekend) {
        return (
          <div className="py-2 px-1 text-center">
            <span className="text-[11px] font-medium text-muted-foreground/40 select-none">
              Off
            </span>
          </div>
        );
      }
      if (day.isToday) {
        return (
          <div className="py-2 px-1 text-center">
            <span className="inline-block text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              Pending
            </span>
          </div>
        );
      }
      if (day.isPast) {
        return (
          <div className="py-2 px-1 text-center">
            <span className="inline-block text-[10px] font-semibold text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
              Absent
            </span>
          </div>
        );
      }
      // Future day
      return (
        <div className="py-2 px-1 text-center text-muted-foreground/30 text-xs">
          —
        </div>
      );
    }

    const checkInTime = typeof record.checkIn === "object" ? record.checkIn?.time : record.checkIn;
    const checkOutTime = typeof record.checkOut === "object" ? record.checkOut?.time : record.checkOut;
    const hours = record.totalHours || calculateHoursBetween(checkInTime, checkOutTime);
    const isLate = Boolean(record.isLate || record.status === "Late");
    const isOvertime = Boolean(record.isOvertime && record.overtimeHours && record.overtimeHours > 0);
    const isHalfDay = record.status === "Half Day";
    const isEdited = Boolean(record.isEdited);

    const editInfo = isEdited 
      ? `Edited by ${record.editedByName || "Admin"}${record.editedAt ? " on " + new Date(record.editedAt).toLocaleDateString() + " " + new Date(record.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`
      : "";

    const tooltipText = `${record.employeeName || "Employee"} • ${day.dayName}, ${day.formatted}
Status: ${record.status || "Present"} (${formatHoursDisplay(hours)})
Check In: ${checkInTime || "--:--"} | Check Out: ${checkOutTime || "--:--"}${isOvertime ? ` • Overtime: +${record.overtimeHours}h` : ""}${editInfo ? ` • ${editInfo}` : ""}${isAdminOrHr ? "\n(Click to edit)" : ""}`;

    return (
      <div 
        className="group relative py-1 px-1 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-muted/30 rounded-md"
        onClick={() => onEditRecord && onEditRecord(record)}
        title={tooltipText}
      >
        {/* Main Status Pill */}
        <div className="flex items-center gap-1">
          {isLate ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {hours > 0 ? `Late (${formatHoursDisplay(hours)})` : "Late"}
            </span>
          ) : isHalfDay ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md dark:text-indigo-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              Half Day
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {hours > 0 ? formatHoursDisplay(hours) : "Present"}
            </span>
          )}

          {/* Tiny Edited Pencil Icon */}
          {isEdited && (
            <span 
              className="text-sky-600 dark:text-sky-400 p-0.5 rounded hover:bg-sky-500/20"
              title={editInfo}
            >
              <Edit2 className="h-2.5 w-2.5" />
            </span>
          )}
        </div>

        {/* Detailed view: in/out times and overtime tag */}
        {!isCompactView && (
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center justify-center gap-1">
            <span>{checkInTime || "--:--"}</span>
            <span className="text-muted-foreground/40">-</span>
            <span>{checkOutTime || "--:--"}</span>
            {isOvertime && (
              <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                +{record.overtimeHours}h
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Employee personal weekly view
  if (!isAdminOrHr && currentUser?.id) {
    const currentUserId = currentUser.id;
    const myRecords = weekDays.map((day) => ({
      day,
      record: attendanceLookup[day.dateKey]?.[currentUserId],
    }));

    const myWeeklyHours = myRecords.reduce((acc, curr) => {
      if (!curr.record) return acc;
      const inT = typeof curr.record.checkIn === "object" ? curr.record.checkIn?.time : curr.record.checkIn;
      const outT = typeof curr.record.checkOut === "object" ? curr.record.checkOut?.time : curr.record.checkOut;
      return acc + (curr.record.totalHours || calculateHoursBetween(inT, outT));
    }, 0);

    const myPresentDays = myRecords.filter((r) => r.record && (r.record.status === "Present" || r.record.status === "On Time")).length;
    const myLateDays = myRecords.filter((r) => r.record && (r.record.isLate || r.record.status === "Late")).length;
    const myOvertimeHours = myRecords.reduce((acc, curr) => acc + (curr.record?.overtimeHours || 0), 0);

    return (
      <div className="space-y-4">
        {/* Weekly Header & Controls */}
        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">My Weekly Attendance</h3>
                <p className="text-xs text-muted-foreground font-mono">{weekLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={handleThisWeek} className="h-8 px-2.5 text-xs font-medium">
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-8 px-2">
                Next
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Hours Logged</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {Math.round(myWeeklyHours * 10) / 10}h
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Days Present</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">
              {myPresentDays} / 5
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Late Arrivals</p>
            <p className={`text-lg font-bold mt-0.5 ${myLateDays > 0 ? "text-amber-600" : "text-foreground"}`}>
              {myLateDays}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Overtime</p>
            <p className="text-lg font-bold text-indigo-600 mt-0.5">
              +{Math.round(myOvertimeHours * 10) / 10}h
            </p>
          </div>
        </div>

        {/* Individual Weekly Detailed Table */}
        <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-36 font-semibold">Day & Date</TableHead>
                  <TableHead className="font-semibold">Shift Window</TableHead>
                  <TableHead className="font-semibold">Check In</TableHead>
                  <TableHead className="font-semibold">Check Out</TableHead>
                  <TableHead className="font-semibold text-right">Hours</TableHead>
                  <TableHead className="font-semibold text-right">Overtime</TableHead>
                  <TableHead className="font-semibold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRecords.map(({ day, record }) => {
                  const checkInTime = typeof record?.checkIn === "object" ? record?.checkIn?.time : record?.checkIn;
                  const checkOutTime = typeof record?.checkOut === "object" ? record?.checkOut?.time : record?.checkOut;
                  const hours = record ? (record.totalHours || calculateHoursBetween(checkInTime, checkOutTime)) : 0;
                  const isLate = Boolean(record?.isLate || record?.status === "Late");
                  const isOvertime = Boolean(record?.isOvertime && record?.overtimeHours && record.overtimeHours > 0);

                  return (
                    <TableRow 
                      key={day.dateKey}
                      className={day.isToday ? "bg-primary/5 font-medium" : day.isWeekend ? "bg-muted/15" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-foreground">{day.dayName}</span>
                          <span className="text-muted-foreground">({day.formatted})</span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary/20 text-primary font-bold">
                              Today
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {record?.shiftStartTime ? `${record.shiftStartTime} - ${record.shiftEndTime || ""}` : "09:00 - 18:00"}
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {checkInTime ? (
                          <span className={isLate ? "text-amber-600 font-semibold" : "text-foreground"}>
                            {checkInTime}
                            {isLate && record?.lateMinutes ? (
                              <span className="text-[10px] ml-1 text-amber-600 font-sans">
                                (+{record.lateMinutes}m)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {checkOutTime ? (
                          <span className="text-foreground">{checkOutTime}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs font-semibold text-foreground">
                        {hours > 0 ? `${hours}h` : "—"}
                      </TableCell>

                      <TableCell className="text-right text-xs font-semibold">
                        {isOvertime ? (
                          <span className="text-amber-600">+{record?.overtimeHours}h</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {record ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {isLate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                                Late
                              </span>
                            ) : record.status === "Half Day" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                                Half Day
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                Present
                              </span>
                            )}
                            {record.isEdited && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-sky-700 bg-sky-500/15 border border-sky-500/30 cursor-help"
                                title={`Edited by ${record.editedByName || "Admin"}`}
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                                Edited
                              </span>
                            )}
                          </div>
                        ) : day.isWeekend ? (
                          <span className="text-xs text-muted-foreground/50">Off</span>
                        ) : day.isPast ? (
                          <span className="text-xs font-medium text-muted-foreground/60">Absent</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  }

  // Admin / HR Matrix View (All Employees across 7 days)
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Week Navigation & Controls Bar */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Week Navigator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrevWeek} 
                  className="h-7 w-7 p-0"
                  title="Previous Week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleThisWeek} 
                  className="h-7 px-2 text-xs font-semibold"
                >
                  This Week
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNextWeek} 
                  className="h-7 w-7 p-0"
                  title="Next Week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5 pl-1">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-bold text-foreground font-mono">{weekLabel}</span>
              </div>
            </div>

            {/* Quick Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[140px] sm:min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {departments.length > 0 && (
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="h-8 px-2 py-0.5 text-xs rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Depts ({distinctEmployees.length})</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-8 px-2 py-0.5 text-xs rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="late">Has Late Arrival</option>
                <option value="overtime">Has Overtime</option>
                <option value="perfect">Perfect Attendance</option>
              </select>

              {/* Density Toggle (Detailed vs Compact) */}
              <Button
                variant={isCompactView ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCompactView(!isCompactView)}
                className="h-8 text-xs px-2.5 gap-1"
                title={isCompactView ? "Show in/out times" : "Minimalist view"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {isCompactView ? "Compact" : "Detailed"}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportWeekCSV}
                className="h-8 text-xs gap-1 px-2.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week-Wise Clean Tabular Matrix */}
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold w-48 sticky left-0 bg-muted/90 backdrop-blur-xs z-10 border-r border-border">
                  Employee
                </th>
                {weekDays.map((day) => (
                  <th 
                    key={day.dateKey} 
                    className={`py-2 px-1 text-center font-semibold border-r border-border min-w-[90px] ${
                      day.isToday ? "bg-primary/10 text-primary font-bold" : day.isWeekend ? "bg-muted/30 text-muted-foreground/60" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{day.dayName}</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-normal">{day.formatted}</span>
                      {day.isToday && (
                        <span className="text-[8px] px-1 rounded bg-primary text-primary-foreground font-bold mt-0.5">
                          Today
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-2 px-2 text-center font-semibold border-r border-border w-16">Days</th>
                <th className="py-2 px-2 text-center font-semibold border-r border-border w-14">Late</th>
                <th className="py-2 px-2.5 text-right font-semibold border-r border-border w-18">Hours</th>
                <th className="py-2 px-2 text-right font-semibold w-16">OT</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted-foreground text-xs">
                    No matching attendance records found for this week.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  let empPresent = 0;
                  let empLate = 0;
                  let empTotalHours = 0;
                  let empOvertime = 0;

                  // Precalculate employee week totals
                  weekDays.forEach((day) => {
                    const rec = attendanceLookup[day.dateKey]?.[emp.id];
                    if (rec) {
                      if (rec.status === "Present" || rec.status === "On Time") empPresent++;
                      if (rec.status === "Late" || rec.isLate) empLate++;
                      const inT = typeof rec.checkIn === "object" ? rec.checkIn?.time : rec.checkIn;
                      const outT = typeof rec.checkOut === "object" ? rec.checkOut?.time : rec.checkOut;
                      empTotalHours += rec.totalHours || calculateHoursBetween(inT, outT);
                      if (rec.overtimeHours && rec.overtimeHours > 0) empOvertime += rec.overtimeHours;
                    }
                  });

                  return (
                    <tr key={emp.id} className="hover:bg-muted/15 transition-colors">
                      {/* Employee Column (Sticky) */}
                      <td className="py-2 px-3 sticky left-0 bg-card hover:bg-muted/15 transition-colors z-10 border-r border-border">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs truncate max-w-[130px]">
                              {emp.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                              {emp.department || "General"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 7 Day Columns */}
                      {weekDays.map((day) => (
                        <td 
                          key={day.dateKey} 
                          className={`p-0.5 border-r border-border align-middle ${
                            day.isToday ? "bg-primary/5" : day.isWeekend ? "bg-muted/15" : ""
                          }`}
                        >
                          {renderDayCell(day, emp.id)}
                        </td>
                      ))}

                      {/* Summary Columns */}
                      <td className="py-2 px-2 text-center border-r border-border text-xs">
                        <span className={`font-semibold ${
                          empPresent >= 5 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        }`}>
                          {empPresent}/5
                        </span>
                      </td>

                      <td className="py-2 px-2 text-center border-r border-border text-xs">
                        {empLate > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {empLate}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </td>

                      <td className="py-2 px-2.5 text-right border-r border-border font-mono font-bold text-xs text-foreground">
                        {empTotalHours > 0 ? `${Math.round(empTotalHours * 10) / 10}h` : "—"}
                      </td>

                      <td className="py-2 px-2 text-right font-mono text-xs">
                        {empOvertime > 0 ? (
                          <span className="text-amber-600 font-bold">
                            +{Math.round(empOvertime * 10) / 10}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Daily Column Summary Footer */}
            {filteredEmployees.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 border-t border-border font-semibold text-[11px]">
                  <td className="py-2 px-3 text-foreground sticky left-0 bg-muted/80 z-10 border-r border-border">
                    Daily Present
                  </td>
                  {daySummaries.map((summary, idx) => (
                    <td key={idx} className="py-2 px-1 text-center border-r border-border">
                      <div className="font-bold text-foreground">
                        {summary.present}/{filteredEmployees.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {summary.totalHrs > 0 ? `${summary.totalHrs}h` : "—"}
                      </div>
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center border-r border-border font-bold text-foreground">
                    {daySummaries.reduce((acc, s) => acc + s.present, 0)}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-border font-bold text-amber-600">
                    {daySummaries.reduce((acc, s) => acc + s.late, 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right border-r border-border font-mono font-bold text-foreground">
                    {Math.round(daySummaries.reduce((acc, s) => acc + s.totalHrs, 0) * 10) / 10}h
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-amber-600">
                    +{weeklyKPIs.totalOvertimeHours}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>
                Showing <span className="font-semibold text-foreground">{Math.min((safeCurrentPage - 1) * pageSize + 1, totalEmployees)}</span>–
                <span className="font-semibold text-foreground">{Math.min(safeCurrentPage * pageSize, totalEmployees)}</span> of{" "}
                <span className="font-semibold text-foreground">{totalEmployees}</span> employees
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-1.5 py-0.5 rounded border border-border bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Navigation Page Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  Prev
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {hasGap && <span className="px-1 text-muted-foreground/60 select-none">...</span>}
                        <Button
                          variant={p === safeCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className={`h-7 w-7 p-0 text-xs font-semibold ${
                            p === safeCurrentPage ? "shadow-xs" : ""
                          }`}
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="h-7 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Clean Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground px-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-foreground">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Late Check-In
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Half Day
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
            Off (Weekend)
          </span>
          <span className="flex items-center gap-1">
            <Edit2 className="h-2.5 w-2.5 text-sky-600" />
            Edited Record (Hover to see editor)
          </span>
        </div>
        {isAdminOrHr && (
          <span className="italic text-[10px]">
            * Click any logged cell to edit record.
          </span>
        )}
      </div>
    </div>
  );
};
