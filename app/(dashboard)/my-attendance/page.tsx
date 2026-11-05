"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { History, Calendar, FileDown, Loader2, CalendarClock, CalendarDays, List, Edit } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { WeekWiseAttendanceTable } from "../../../components/attendance/WeekWiseAttendanceTable";
import { FieldShiftTracker } from "../../../components/attendance/FieldShiftTracker";

interface AttendanceLog {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalHours: string;
  isEdited?: boolean;
  editedByName?: string;
  editedAt?: string | Date;
}

// Helper to format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Helper to calculate hours
const calculateHours = (checkIn?: string, checkOut?: string): string => {
  if (!checkIn || !checkOut) return '-';
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  let hours = outH - inH;
  let mins = outM - inM;
  if (mins < 0) { hours--; mins += 60; }
  if (hours < 0) hours += 24;
  return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
};

export default function MyAttendancePage() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({ totalDays: 0, lateArrivals: 0, avgHours: 0 });

  useEffect(() => {
    if (user) fetchMyAttendance();
  }, [user?.id]);

  const fetchMyAttendance = async () => {
    try {
      setDataLoading(true);
      const response = await fetch(`/api/attendance?employeeId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      
      // Transform data - extract time from nested checkIn/checkOut objects
      const transformed = data.map((record: any) => {
        const checkInTime = record.checkIn?.time || record.checkIn || '-';
        const checkOutTime = record.checkOut?.time || record.checkOut || '-';
        return {
          id: record.id,
          date: formatDate(record.date),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: record.status,
          totalHours: calculateHours(checkInTime, checkOutTime),
          isEdited: record.isEdited,
          editedByName: record.editedByName,
          editedAt: record.editedAt,
        };
      });
      
      setLogs(transformed);
      setRawRecords(data);
      
      // Calculate stats
      const totalDays = transformed.length;
      const lateArrivals = transformed.filter((l: AttendanceLog) => l.status === 'Late').length;
      const avgHours = totalDays > 0 
        ? transformed.reduce((sum: number, l: AttendanceLog) => {
            const hours = parseFloat(l.totalHours.replace('h', '').split(' ')[0]) || 0;
            return sum + hours;
          }, 0) / totalDays 
        : 0;
      
      setStats({ totalDays, lateArrivals, avgHours: Math.round(avgHours * 10) / 10 });
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        icon={<CalendarClock />}
        title="Attendance History"
        description="View and download your historical work session records."
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'weekly' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode(viewMode === 'weekly' ? 'daily' : 'weekly')}
              className="text-xs font-semibold gap-1.5"
            >
              {viewMode === 'weekly' ? (
                <>
                  <List className="h-3.5 w-3.5" />
                  Monthly History Log
                </>
              ) : (
                <>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Week-Wise Tabular View
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Live Mobile Field Shift & Break Tracker */}
      <FieldShiftTracker />

      {/* View Switcher Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'weekly'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Week-Wise Tabular View
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              viewMode === 'weekly' ? 'bg-primary/10 text-primary font-bold' : 'bg-muted text-muted-foreground'
            }`}>
              Matrix
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Monthly Log Records
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              viewMode === 'daily' ? 'bg-primary/10 text-primary font-bold' : 'bg-muted text-muted-foreground'
            }`}>
              {logs.length}
            </span>
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          {viewMode === 'weekly' 
            ? 'Timesheet matrix: Monday to Sunday breakdown' 
            : 'Chronological history of work sessions'}
        </span>
      </div>

      {viewMode === 'weekly' ? (
        <WeekWiseAttendanceTable
          attendance={rawRecords}
          isAdminOrHr={false}
          currentUser={user}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Stats Summary - Real Data */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Work Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalDays}
                </div>
                <p className="text-xs text-gray-400 mt-1">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Late arrivals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.lateArrivals}
                </div>
                <p className="text-xs text-gray-400 mt-1">Check-in after 09:00 AM</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-slate-400">Average Daily Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.avgHours}h`}
                </div>
                <p className="text-xs text-gray-400 mt-1">Consistent performance</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Logs Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History size={18} />
                  Recent Logs
                </CardTitle>
                <CardDescription>Your work history for this month.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead className="text-right">Total Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          title="No attendance records found."
                          description="Start checking in!"
                          icon={<Calendar size={18} />}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="group">
                        <TableCell className="font-medium text-gray-900 dark:text-slate-100">{log.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                              ${log.status === 'Present' ? 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/15 dark:border-primary/30' 
                              : log.status === 'Late' ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                              : 'bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/15 dark:border-destructive/30'}`}
                            >
                              {log.status}
                            </span>
                            {log.isEdited && (
                              <span 
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-500/15 text-sky-700 border border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 cursor-help"
                                title={`Edited by ${log.editedByName || 'Admin'}${log.editedAt ? ' on ' + new Date(log.editedAt).toLocaleString() : ''}`}
                              >
                                <Edit className="h-2.5 w-2.5" />
                                Edited
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{log.checkIn}</TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{log.checkOut}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {log.totalHours}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
