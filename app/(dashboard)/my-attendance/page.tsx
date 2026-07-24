"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";
import { History, Calendar, FileDown, Loader2 } from "lucide-react";

interface AttendanceLog {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalHours: string;
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
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({ totalDays: 0, lateArrivals: 0, avgHours: 0 });

  useEffect(() => {
    if (user) fetchMyAttendance();
  }, [user]);

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
        };
      });
      
      setLogs(transformed);
      
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
          <p className="text-gray-500">View and download your historical work session records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar size={16} />
            Filter Date
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileDown size={16} />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Stats Summary - Real Data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Work Days</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-500">Total Late arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.lateArrivals}
            </div>
            <p className="text-xs text-gray-400 mt-1">Check-in after 09:00 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Average Daily Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
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
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No attendance records found. Start checking in!
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="font-medium text-gray-900">{log.date}</TableCell>
                    <TableCell>
                      <span 
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                        ${log.status === 'Present' ? 'bg-green-100 text-green-800' 
                        : log.status === 'Late' ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'}`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{log.checkIn}</TableCell>
                    <TableCell className="text-gray-600">{log.checkOut}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {log.totalHours}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
