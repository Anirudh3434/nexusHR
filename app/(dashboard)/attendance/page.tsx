"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getAttendance, logAttendance, getTodayAttendance, updateAttendanceRecord, deleteAttendanceRecord, AttendanceRecord } from "../../../services/attendanceService";
import { getShifts, WorkShift } from "../../../services/shiftService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Edit, Trash2, X, Filter, Search, Download, BarChart3, PieChart as PieChartIcon, Users } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ModalPortal } from "../../../components/ui/ModalPortal";

// Helper to format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Helper function to calculate hours from check-in and check-out times
const calculateHours = (checkIn?: string, checkOut?: string): string => {
  if (!checkIn || !checkOut) return '-';
  
  const [inHours, inMinutes] = checkIn.split(':').map(Number);
  const [outHours, outMinutes] = checkOut.split(':').map(Number);
  
  let hours = outHours - inHours;
  let minutes = outMinutes - inMinutes;
  
  if (minutes < 0) {
    hours--;
    minutes += 60;
  }
  
  if (hours < 0) {
    hours += 24;
  }
  
  return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
};

// Get current time in HH:mm format
const getCurrentTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function AttendancePage() {
  const { user, loading, hasRole } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [userShift, setUserShift] = useState<WorkShift | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showCharts, setShowCharts] = useState(true);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id, user?.companyId, user?.workShiftId]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // Fetch today's attendance for current user
      if (user?.id) {
        const today = await getTodayAttendance(user.id);
        setTodayAttendance(today);
      }
      
      // Fetch user's shift details
      if (user?.workShiftId) {
        const shifts = await getShifts(user.companyId || '');
        const shift = shifts.find((s: WorkShift) => s._id === user.workShiftId);
        setUserShift(shift || null);
      }
      
      // Admin/HR: fetch all attendance
      if (hasRole(["admin", "hr"])) {
        const data = await getAttendance({ companyId: user?.companyId || undefined });
        setAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user?.id || !user?.companyId) return;
    
    setIsCheckingIn(true);
    try {
      const now = getCurrentTime();
      const response = await logAttendance({
        employeeId: user.id,
        companyId: user.companyId,
        date: new Date().toISOString().split('T')[0],
        checkIn: now,
      });
      
      addToast({
        type: response.isLate ? 'error' : 'success',
        title: response.isLate ? 'Checked In (Late)' : 'Checked In',
        description: response.isLate 
          ? `You are ${response.lateMinutes} minutes late. Shift starts at ${userShift?.startTime || 'N/A'}`
          : 'You are on time! Great job!',
      });
      
      fetchData();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to check in' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id || !user?.companyId) return;
    
    setIsCheckingOut(true);
    try {
      const now = getCurrentTime();
      const response = await logAttendance({
        employeeId: user.id,
        companyId: user.companyId,
        date: new Date().toISOString().split('T')[0],
        checkOut: now,
      });
      
      addToast({
        type: 'success',
        title: response.isOvertime ? 'Checked Out (Overtime)' : 'Checked Out',
        description: response.isOvertime 
          ? `Great work! You worked ${response.overtimeHours} hours overtime.`
          : 'Have a great rest of your day!',
      });
      
      fetchData();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to check out' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    
    setIsUpdating(true);
    try {
      await updateAttendanceRecord(editingRecord.id, {
        checkIn: typeof editingRecord.checkIn === 'object' ? editingRecord.checkIn.time : editingRecord.checkIn,
        checkOut: typeof editingRecord.checkOut === 'object' ? editingRecord.checkOut.time : editingRecord.checkOut,
        status: editingRecord.status,
        note: editingRecord.note,
        workMode: editingRecord.workMode,
      });
      addToast({ type: 'success', title: 'Updated', description: 'Attendance record updated successfully' });
      setEditingRecord(null);
      fetchData();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update record' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      await deleteAttendanceRecord(id);
      addToast({ type: 'success', title: 'Deleted', description: 'Record removed successfully' });
      fetchData();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to delete record' });
    }
  };

  const handleExportCSV = () => {
    const recordsToExport = filteredAttendance.length > 0 ? filteredAttendance : attendance;
    if (recordsToExport.length === 0) {
      addToast({ type: 'info', title: 'Export', description: 'No attendance records to export' });
      return;
    }
    const headers = ['Date', 'Employee', 'Department', 'Status', 'Check In', 'Shift Start', 'Check Out', 'Hours', 'Overtime Hours'];
    const rows = recordsToExport.map((log: any) => [
      log.date || '',
      log.employeeName || user?.name || '',
      log.department || '',
      log.status || '',
      log.checkIn?.time || log.checkIn || '',
      log.shiftStartTime || '',
      log.checkOut?.time || log.checkOut || '',
      log.totalHours || '',
      log.overtimeHours || '0',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAttendance = attendance.filter(log => {
    const matchesSearch = log.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterDate ? log.date.includes(filterDate) : true;
    return matchesSearch && matchesDate;
  });

  // Status badge component
  const StatusBadge = ({ status, isLate, isOvertime }: { status?: string; isLate?: boolean; isOvertime?: boolean }) => {
    if (isLate || status === 'Late') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/15 dark:border-destructive/30">
          <AlertCircle className="h-3 w-3" />
          Late
        </span>
      );
    }
    if (isOvertime) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
          <Clock className="h-3 w-3" />
          Overtime
        </span>
      );
    }
    if (status === 'On Time' || status === 'Present') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/15 dark:border-primary/30">
          <CheckCircle className="h-3 w-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border">
        {status || 'Not Marked'}
      </span>
    );
  };

  // Computed analytics for graphical and pie chart visual
  const totalLogs = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'Present' || a.status === 'On Time').length;
  const lateCount = attendance.filter(a => a.status === 'Late' || a.isLate).length;
  const halfDayCount = attendance.filter(a => a.status === 'Half Day').length;

  const presentPercent = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0;
  const latePercent = totalLogs > 0 ? Math.round((lateCount / totalLogs) * 100) : 0;
  const halfDayPercent = totalLogs > 0 ? Math.round((halfDayCount / totalLogs) * 100) : 0;

  // Pie chart stroke calculations (Circumference: 2 * Math.PI * 65 ≈ 408.4)
  const c = 408.4;
  const presentStroke = totalLogs > 0 ? (presentCount / totalLogs) * c : 0;
  const lateStroke = totalLogs > 0 ? (lateCount / totalLogs) * c : 0;
  const halfDayStroke = totalLogs > 0 ? (halfDayCount / totalLogs) * c : 0;

  // 12-day trend calculations
  const datesMap: Record<string, { date: string; displayDate: string; present: number; late: number; halfDay: number; total: number }> = {};
  attendance.forEach(a => {
    if (!a.date) return;
    const d = new Date(a.date);
    const key = d.toISOString().slice(0, 10);
    const display = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    if (!datesMap[key]) {
      datesMap[key] = { date: key, displayDate: display, present: 0, late: 0, halfDay: 0, total: 0 };
    }
    datesMap[key].total++;
    if (a.status === 'Present' || a.status === 'On Time') datesMap[key].present++;
    else if (a.status === 'Late' || a.isLate) datesMap[key].late++;
    else if (a.status === 'Half Day') datesMap[key].halfDay++;
  });
  const trendDays = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  const maxDayTotal = Math.max(...trendDays.map(t => t.total), 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        icon={<Clock />}
        title="Attendance"
        description="Mark attendance, inspect punctuality metrics, and view check-in logs."
        actions={
          hasRole(["admin", "hr"]) && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCharts(!showCharts)}>
                <BarChart3 className="mr-1.5 h-4 w-4" />
                {showCharts ? 'Hide Visuals' : 'Analytics & Charts'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )
        }
      />

      {/* Self Check-in Card */}
      <Card className="rounded-[14px] border border-border bg-card shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Today's Attendance
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-0.5">
                  <span>
                    Current Time: <span className="font-mono font-medium text-foreground">{currentTime}</span>
                  </span>
                  {userShift && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-primary font-medium">
                        Shift: {userShift.startTime} - {userShift.endTime}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!todayAttendance?.checkIn ? (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={isCheckingIn}
                  className="gap-2 font-medium"
                >
                  {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Check In
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Checked in at:</span>
                    <span className="font-mono font-semibold text-foreground">{todayAttendance.checkIn.time}</span>
                    <StatusBadge status={todayAttendance.status} isLate={todayAttendance.isLate} />
                  </div>
                  
                  {!todayAttendance?.checkOut ? (
                    <Button 
                      onClick={handleCheckOut} 
                      disabled={isCheckingOut}
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-destructive/30 gap-1.5"
                    >
                      {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Check Out
                    </Button>
                  ) : (
                    <span className="text-sm">
                      <span className="text-muted-foreground">Out:</span>
                      <span className="font-mono font-semibold text-foreground ml-1">{todayAttendance.checkOut.time}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Late Warning */}
          {todayAttendance?.isLate && (
            <div className="mt-4 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  You were {todayAttendance.lateMinutes} minutes late today
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Shift starts at {todayAttendance.shiftStartTime || userShift?.startTime}. 
                  Try to arrive on time tomorrow!
                </p>
              </div>
            </div>
          )}
          
          {/* On Time Success */}
          {todayAttendance?.status === 'On Time' && (
            <div className="mt-4 p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary">
                  Great job! You are on time today.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keep up the good work!
                </p>
              </div>
            </div>
          )}
          
          {/* Overtime Info */}
          {todayAttendance?.isOvertime && (
            <div className="mt-4 p-3.5 bg-muted/60 border border-border rounded-xl flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Overtime: {todayAttendance.overtimeHours} hours
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todayAttendance.isLate 
                    ? `You worked extra to compensate for being ${todayAttendance.lateMinutes} minutes late.`
                    : 'Great dedication! Extra hours worked beyond shift end.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphical and Pie Chart Visuals Section */}
      {showCharts && hasRole(["admin", "hr"]) && attendance.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-[14px] border border-border bg-card shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground font-display">{presentPercent}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On-Time Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-border bg-card shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground font-display">{lateCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late Arrivals</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-border bg-card shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                  <Clock className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground font-display">{halfDayCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Half-Day Records</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-border bg-card shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight text-foreground font-display">{totalLogs}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Logs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visuals: Pie / Donut Chart & Daily Trend Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Pie / Donut Chart */}
            <Card className="lg:col-span-5 rounded-[14px] border border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    Attendance Distribution
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">Pie / Donut View</span>
                </div>
                <CardDescription>Overall breakdown by check-in status</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 160 160" className="w-36 h-36 transform -rotate-90">
                      <circle cx="80" cy="80" r="65" fill="none" stroke="currentColor" strokeWidth="22" className="text-muted/30" />
                      {/* Present */}
                      <circle cx="80" cy="80" r="65" fill="none" stroke="#10b981" strokeWidth="22"
                        strokeDasharray={`${presentStroke} ${c}`} strokeDashoffset="0" className="transition-all duration-500" />
                      {/* Late */}
                      <circle cx="80" cy="80" r="65" fill="none" stroke="#f59e0b" strokeWidth="22"
                        strokeDasharray={`${lateStroke} ${c}`} strokeDashoffset={String(-presentStroke)} className="transition-all duration-500" />
                      {/* Half Day */}
                      <circle cx="80" cy="80" r="65" fill="none" stroke="#6366f1" strokeWidth="22"
                        strokeDasharray={`${halfDayStroke} ${c}`} strokeDashoffset={String(-(presentStroke + lateStroke))} className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold font-display text-foreground">{totalLogs}</span>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Logs</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 
                        <span className="font-medium text-foreground">Present</span>
                      </span>
                      <span className="font-semibold text-foreground">{presentCount} ({presentPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 
                        <span className="font-medium text-foreground">Late Arrivals</span>
                      </span>
                      <span className="font-semibold text-foreground">{lateCount} ({latePercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 
                        <span className="font-medium text-foreground">Half Day</span>
                      </span>
                      <span className="font-semibold text-foreground">{halfDayCount} ({halfDayPercent}%)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Trend Graphical Bar Chart */}
            <Card className="lg:col-span-7 rounded-[14px] border border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Daily Attendance Trends
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500"></span> Present</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500"></span> Late</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500"></span> Half Day</span>
                  </div>
                </div>
                <CardDescription>Shift punctuality over recent workdays</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-36 w-full flex items-end gap-2 border-b border-border pb-2 pt-2">
                  {trendDays.map((day) => {
                    const pH = (day.present / maxDayTotal) * 100;
                    const lH = (day.late / maxDayTotal) * 100;
                    const hH = (day.halfDay / maxDayTotal) * 100;
                    return (
                      <div 
                        key={day.date} 
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" 
                        title={`${day.displayDate}: ${day.present} Present, ${day.late} Late, ${day.halfDay} Half Day`}
                      >
                        <div className="w-full flex flex-col-reverse rounded-t overflow-hidden transition-all group-hover:opacity-80" style={{ height: '100%' }}>
                          <div style={{ height: `${pH}%` }} className="bg-emerald-500"></div>
                          <div style={{ height: `${lH}%` }} className="bg-amber-500"></div>
                          <div style={{ height: `${hH}%` }} className="bg-indigo-500"></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full font-mono">
                          {day.displayDate.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>Daily Shift Volume (Max {maxDayTotal} records/day)</span>
                  <span className="font-medium text-emerald-600">Avg {presentPercent}% On-Time</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily Log</CardTitle>
          <CardDescription>Records for today and the previous days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by employee name..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-48">
              <Input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {hasRole(["admin", "hr"]) && <TableHead>Employee</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Shift Start</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                {hasRole(["admin", "hr"]) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={hasRole(["admin", "hr"]) ? 8 : 6} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !hasRole(["admin", "hr"]) ? (
                // Employee view - show their own records
                <TableRow>
                  <TableCell className="font-medium">{formatDate(new Date().toISOString())}</TableCell>
                  <TableCell>
                    <StatusBadge status={todayAttendance?.status} isLate={todayAttendance?.isLate} isOvertime={todayAttendance?.isOvertime} />
                  </TableCell>
                  <TableCell>{todayAttendance?.checkIn?.time || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{todayAttendance?.shiftStartTime || userShift?.startTime || '-'}</TableCell>
                  <TableCell>{todayAttendance?.checkOut?.time || '-'}</TableCell>
                  <TableCell className="text-right">
                    {todayAttendance?.isOvertime ? (
                      <span className="text-amber-700 font-medium dark:text-amber-400">{todayAttendance?.totalHours} hrs (+{todayAttendance?.overtimeHours} OT)</span>
                    ) : (
                      <span>{todayAttendance?.totalHours || '-'} hrs</span>
                    )}
                  </TableCell>
                </TableRow>
              ) : filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasRole(["admin", "hr"]) ? 8 : 6} className="p-0">
                    <EmptyState title="No attendance records found." icon={<Clock size={18} />} />
                  </TableCell>
                </TableRow>
              ) : (
                // Admin/HR view - show all records
                filteredAttendance.map((log: any) => {
                  const checkInTime = log.checkIn?.time || log.checkIn || '-';
                  const checkOutTime = log.checkOut?.time || log.checkOut || '-';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{formatDate(log.date)}</TableCell>
                      {hasRole(["admin", "hr"]) && (
                        <TableCell>
                          <div className="font-medium text-foreground">{log.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{log.department}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <StatusBadge status={log.status} isLate={log.isLate} isOvertime={log.isOvertime} />
                      </TableCell>
                      <TableCell>{checkInTime}</TableCell>
                      <TableCell className="text-muted-foreground">{log.shiftStartTime || '-'}</TableCell>
                      <TableCell>{checkOutTime}</TableCell>
                      <TableCell className="text-right">
                        {log.isOvertime ? (
                          <span className="text-amber-700 font-medium dark:text-amber-400">{log.totalHours} hrs (+{log.overtimeHours} OT)</span>
                        ) : (
                          <span>{log.totalHours ? `${log.totalHours} hrs` : calculateHours(checkInTime, checkOutTime)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingRecord(log)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRecord(log.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

            {/* Edit Modal */}
      {editingRecord && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-bold text-lg text-foreground">Edit Attendance</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingRecord(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <form onSubmit={handleUpdateRecord} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Employee</label>
                  <div className="font-semibold text-foreground">{editingRecord.employeeName}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Check In</label>
                    <Input 
                      type="time" 
                      value={typeof editingRecord.checkIn === 'object' ? editingRecord.checkIn.time : editingRecord.checkIn || ''} 
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        checkIn: { ...((editingRecord.checkIn as any) || {}), time: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Check Out</label>
                    <Input 
                      type="time" 
                      value={typeof editingRecord.checkOut === 'object' ? editingRecord.checkOut.time : editingRecord.checkOut || ''} 
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        checkOut: { ...((editingRecord.checkOut as any) || {}), time: e.target.value }
                      })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status Override (Optional)</label>
                  <select 
                    className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    value={editingRecord.status}
                    onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="On Time">On Time</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Work Mode</label>
                  <select 
                    className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    value={editingRecord.workMode || 'office'}
                    onChange={(e) => setEditingRecord({ ...editingRecord, workMode: e.target.value as any })}
                  >
                    <option value="office">Office</option>
                    <option value="wfh">Work From Home</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingRecord(null)} type="button">
                    Cancel
                  </Button>
                  <Button className="flex-1" disabled={isUpdating} type="submit">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
