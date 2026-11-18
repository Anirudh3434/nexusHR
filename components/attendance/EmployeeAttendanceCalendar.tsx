"use client";

import React, { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Laptop, 
  MapPin, 
  Briefcase, 
  X, 
  Edit2,
  CalendarDays,
  Coffee,
  Check
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { ModalPortal } from "../ui/ModalPortal";
import { AttendanceRecord } from "../../services/attendanceService";

interface EmployeeAttendanceCalendarProps {
  attendance: AttendanceRecord[];
  currentUser?: { id?: string; name?: string; role?: string } | null;
}

// Convert any date to "YYYY-MM-DD"
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

// Calculate hours between two "HH:mm" time strings
const calculateHoursBetween = (inTime?: string, outTime?: string): number => {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);
  if (isNaN(inH) || isNaN(outH)) return 0;
  let mins = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function EmployeeAttendanceCalendar({ attendance, currentUser }: EmployeeAttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedRecord, setSelectedRecord] = useState<{ record?: AttendanceRecord; date: Date; dateKey: string } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build lookup map for attendance by dateKey
  const attendanceLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((rec) => {
      const key = toDateKey(rec.date);
      if (key) {
        map.set(key, rec);
      }
    });
    return map;
  }, [attendance]);

  // Today string
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  // Compute calendar days for the current month
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // In JS: 0=Sun, 1=Mon, ..., 6=Sat.
    // We want Monday as index 0:
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days = [];

    // Trailing days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const key = toDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: key === todayKey,
        isPast: key < todayKey,
        record: attendanceLookup.get(key),
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const key = toDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNum: day,
        isCurrentMonth: true,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: key === todayKey,
        isPast: key < todayKey,
        record: attendanceLookup.get(key),
      });
    }

    // Leading days from next month to complete the grid (up to multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = toDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: key === todayKey,
        isPast: key < todayKey,
        record: attendanceLookup.get(key),
      });
    }

    return days;
  }, [year, month, attendanceLookup, todayKey]);

  // Monthly statistics for currently viewed month
  const monthlyStats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalHours = 0;
    let overtimeHours = 0;

    calendarGrid.forEach((day) => {
      if (!day.isCurrentMonth) return;

      if (day.record) {
        const inT = typeof day.record.checkIn === "object" ? day.record.checkIn?.time : day.record.checkIn;
        const outT = typeof day.record.checkOut === "object" ? day.record.checkOut?.time : day.record.checkOut;
        const hrs = day.record.totalHours || calculateHoursBetween(inT, outT);

        totalHours += hrs;
        overtimeHours += day.record.overtimeHours || 0;

        if (day.record.status === "Late" || day.record.isLate) {
          lateCount++;
          presentCount++;
        } else if (day.record.status === "Half Day") {
          halfDayCount++;
        } else if (day.record.status === "Present" || day.record.status === "On Time") {
          presentCount++;
        }
      } else if (day.isPast && !day.isWeekend) {
        absentCount++;
      }
    });

    const avgHours = presentCount > 0 ? Math.round((totalHours / presentCount) * 10) / 10 : 0;

    return {
      presentCount,
      lateCount,
      halfDayCount,
      absentCount,
      totalHours: Math.round(totalHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      avgHours,
    };
  }, [calendarGrid]);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Month Navigation & Stats Bar */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Month Selector */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">{monthName}</h3>
                <p className="text-xs text-muted-foreground">
                  Individual attendance calendar for {currentUser?.name || "Employee"}
                </p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5 self-start md:self-auto">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 px-2.5">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} className="h-8 px-3 text-xs font-medium">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 px-2.5">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 mt-4 border-t border-border/60">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Days Present</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {monthlyStats.presentCount} Days
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Late Arrivals</p>
              <p className={`text-base font-bold mt-0.5 ${monthlyStats.lateCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {monthlyStats.lateCount}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Half Days</p>
              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {monthlyStats.halfDayCount}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hours Worked</p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {monthlyStats.totalHours}h
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 col-span-2 sm:col-span-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Daily Average</p>
              <p className="text-base font-bold text-primary mt-0.5">
                {monthlyStats.avgHours}h / day
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid Container */}
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Day-of-Week Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center font-medium text-xs text-muted-foreground">
          {WEEKDAYS.map((day, idx) => (
            <div 
              key={day} 
              className={`py-2.5 sm:py-3 ${idx === 5 || idx === 6 ? "text-rose-500/80 dark:text-rose-400/80 font-semibold" : ""}`}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* 7-column Calendar Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border bg-card">
          {calendarGrid.map((day) => {
            const { date, dateKey, dayNum, isCurrentMonth, isWeekend, isToday, isPast, record } = day;
            const checkInTime = typeof record?.checkIn === "object" ? record?.checkIn?.time : record?.checkIn;
            const checkOutTime = typeof record?.checkOut === "object" ? record?.checkOut?.time : record?.checkOut;
            const isLate = Boolean(record?.isLate || record?.status === "Late");
            const isHalfDay = record?.status === "Half Day";
            const isPresent = Boolean(record && !isHalfDay);
            const hours = record ? (record.totalHours || calculateHoursBetween(checkInTime, checkOutTime)) : 0;

            // Background / styling logic
            let cellBg = isCurrentMonth ? "bg-background" : "bg-muted/15 text-muted-foreground/50";
            if (isToday) {
              cellBg = "bg-primary/5 ring-1 ring-inset ring-primary/40";
            } else if (isWeekend && isCurrentMonth) {
              cellBg = "bg-muted/10";
            }

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedRecord({ record, date, dateKey })}
                className={`min-h-[85px] sm:min-h-[115px] p-1.5 sm:p-2.5 transition-all cursor-pointer relative group flex flex-col justify-between hover:bg-muted/30 ${cellBg}`}
              >
                {/* Date header in cell */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs sm:text-sm font-semibold rounded-md h-6 w-6 sm:h-7 sm:w-7 ${
                      isToday
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : isCurrentMonth
                        ? isWeekend
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                      Today
                    </span>
                  )}
                </div>

                {/* Status and Session Info */}
                <div className="space-y-1 my-auto">
                  {record ? (
                    <div className="space-y-0.5 sm:space-y-1">
                      {/* Status Tag */}
                      <div className="flex items-center gap-1">
                        {isLate ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300 w-full truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="truncate">Late</span>
                            {record.lateMinutes ? (
                              <span className="hidden sm:inline text-[9px] font-mono opacity-80">
                                +{record.lateMinutes}m
                              </span>
                            ) : null}
                          </span>
                        ) : isHalfDay ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 border border-indigo-500/30 dark:text-indigo-300 w-full truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">Half Day</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300 w-full truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">Present</span>
                          </span>
                        )}
                      </div>

                      {/* Check-in / Check-out time snippets (Desktop) */}
                      <div className="hidden sm:block text-[10px] font-mono text-muted-foreground leading-tight space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground/80">In:</span>
                          <span className={`font-semibold ${isLate ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                            {checkInTime || "—"}
                          </span>
                        </div>
                        {checkOutTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground/80">Out:</span>
                            <span className="font-semibold text-foreground">{checkOutTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isWeekend && isCurrentMonth ? (
                    <div className="hidden sm:block text-center py-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60 italic">
                        Weekly Off
                      </span>
                    </div>
                  ) : isPast && isCurrentMonth ? (
                    <div className="py-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400 w-full truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate">Absent</span>
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Footer of cell: Duration / Indicators */}
                <div className="flex items-center justify-between text-[9px] font-mono pt-1 text-muted-foreground">
                  {hours > 0 ? (
                    <span className="font-semibold text-foreground bg-muted/60 px-1 py-0.2 rounded">
                      {hours}h
                    </span>
                  ) : (
                    <span />
                  )}

                  {record?.isOvertime && (
                    <span className="hidden sm:inline-block text-[9px] text-amber-600 font-bold" title="Overtime logged">
                      +OT
                    </span>
                  )}

                  {record?.isEdited && (
                    <span className="text-sky-600" title={`Edited by ${record.editedByName || "Admin"}`}>
                      <Edit2 className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground font-medium">Present / On Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground font-medium">Late Arrival</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-muted-foreground font-medium">Half Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground font-medium">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground font-medium">Weekly Off</span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            Click any calendar day to inspect detailed shift record
          </span>
        </div>
      </Card>

      {/* Selected Day Details Modal */}
      {selectedRecord && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {selectedRecord.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">{selectedRecord.dateKey}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedRecord(null)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-5 space-y-4">
                {selectedRecord.record ? (
                  <>
                    {/* Status Badge & Work Mode */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Attendance Status</p>
                        <div className="mt-1">
                          {selectedRecord.record.isLate || selectedRecord.record.status === "Late" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                              Late Arrival (+{selectedRecord.record.lateMinutes || 0}m)
                            </span>
                          ) : selectedRecord.record.status === "Half Day" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-700 border border-indigo-500/30 dark:text-indigo-300">
                              <Clock className="h-3.5 w-3.5 text-indigo-500" />
                              Half Day
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              Present / On Time
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedRecord.record.workMode && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Work Mode</p>
                          <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border">
                            {selectedRecord.record.workMode === "wfh" ? (
                              <>
                                <Laptop className="h-3 w-3 text-primary" />
                                WFH
                              </>
                            ) : selectedRecord.record.workMode === "field" ? (
                              <>
                                <MapPin className="h-3 w-3 text-emerald-600" />
                                Field Work
                              </>
                            ) : (
                              <>
                                <Briefcase className="h-3 w-3 text-muted-foreground" />
                                In-Office
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Check In & Check Out Times */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-border bg-card">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          Check In
                        </p>
                        <p className="text-lg font-mono font-bold text-foreground mt-1">
                          {typeof selectedRecord.record.checkIn === "object" ? selectedRecord.record.checkIn?.time : selectedRecord.record.checkIn || "—"}
                        </p>
                        {selectedRecord.record.shiftStartTime && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            Scheduled: {selectedRecord.record.shiftStartTime}
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-xl border border-border bg-card">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-rose-600" />
                          Check Out
                        </p>
                        <p className="text-lg font-mono font-bold text-foreground mt-1">
                          {typeof selectedRecord.record.checkOut === "object" ? selectedRecord.record.checkOut?.time : selectedRecord.record.checkOut || "Active"}
                        </p>
                        {selectedRecord.record.shiftEndTime && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            Scheduled: {selectedRecord.record.shiftEndTime}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Hours Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-border bg-muted/20">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Duration</p>
                        <p className="text-base font-bold text-foreground font-mono mt-0.5">
                          {selectedRecord.record.totalHours ? `${selectedRecord.record.totalHours}h` : "—"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-border bg-muted/20">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overtime</p>
                        <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                          {selectedRecord.record.overtimeHours ? `+${selectedRecord.record.overtimeHours}h` : "None"}
                        </p>
                      </div>
                    </div>

                    {/* Admin Edit notice */}
                    {selectedRecord.record.isEdited && (
                      <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300 flex items-center gap-2">
                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Manually updated by <strong>{selectedRecord.record.editedByName || "HR Admin"}</strong>
                          {selectedRecord.record.editedAt ? ` on ${new Date(selectedRecord.record.editedAt).toLocaleDateString()}` : ""}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 space-y-2">
                    <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedRecord.date.getDay() === 0 || selectedRecord.date.getDay() === 6
                        ? "Weekly Off / Weekend"
                        : selectedRecord.dateKey < todayKey
                        ? "No Attendance Logged (Absent)"
                        : "Future Workday"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {selectedRecord.dateKey < todayKey
                        ? "No check-in or work shift was registered for this day."
                        : "Shift details will be recorded once check-in occurs."}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-border bg-muted/30 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
