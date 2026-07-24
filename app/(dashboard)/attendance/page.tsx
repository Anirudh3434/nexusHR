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
import { Loader2, Clock, LogIn, LogOut, AlertCircle, CheckCircle, Edit, Trash2, X, Filter, Search } from "lucide-react";

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
  }, [user]);

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

  const filteredAttendance = attendance.filter(log => {
    const matchesSearch = log.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterDate ? log.date.includes(filterDate) : true;
    return matchesSearch && matchesDate;
  });

  // Status badge component
  const StatusBadge = ({ status, isLate, isOvertime }: { status?: string; isLate?: boolean; isOvertime?: boolean }) => {
    if (isLate || status === 'Late') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3" />
          Late
        </span>
      );
    }
    if (isOvertime) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
          <Clock className="h-3 w-3" />
          Overtime
        </span>
      );
    }
    if (status === 'On Time') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          On Time
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === 'Present' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {status || 'Not Marked'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8 text-blue-600" />
            Attendance
          </h1>
          <p className="text-gray-500">Mark attendance and view your check-in records.</p>
        </div>
        {hasRole(["admin", "hr"]) && (
          <Button variant="outline">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Export CSV
          </Button>
        )}
      </div>

      {/* Self Check-in Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Today's Attendance
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Current Time: <span className="font-mono font-medium">{currentTime}</span>
                {userShift && (
                  <span className="ml-2 text-blue-600">
                    | Shift: {userShift.startTime} - {userShift.endTime}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-3">
              {!todayAttendance?.checkIn ? (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={isCheckingIn}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Check In
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="text-gray-500">Checked in at:</span>
                    <span className="font-mono font-medium ml-1">{todayAttendance.checkIn.time}</span>
                    <StatusBadge status={todayAttendance.status} isLate={todayAttendance.isLate} />
                  </div>
                  
                  {!todayAttendance?.checkOut ? (
                    <Button 
                      onClick={handleCheckOut} 
                      disabled={isCheckingOut}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                      Check Out
                    </Button>
                  ) : (
                    <span className="text-sm">
                      <span className="text-gray-500">Out:</span>
                      <span className="font-mono font-medium ml-1">{todayAttendance.checkOut.time}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Late Warning */}
          {todayAttendance?.isLate && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  You were {todayAttendance.lateMinutes} minutes late today
                </p>
                <p className="text-xs text-red-600">
                  Shift starts at {todayAttendance.shiftStartTime || userShift?.startTime}. 
                  Try to arrive on time tomorrow!
                </p>
              </div>
            </div>
          )}
          
          {/* On Time Success */}
          {todayAttendance?.status === 'On Time' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Great job! You are on time today.
                </p>
                <p className="text-xs text-green-600">
                  Keep up the good work!
                </p>
              </div>
            </div>
          )}
          
          {/* Overtime Info */}
          {todayAttendance?.isOvertime && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
              <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">
                  Overtime: {todayAttendance.overtimeHours} hours
                </p>
                <p className="text-xs text-purple-600">
                  {todayAttendance.isLate 
                    ? `You worked extra to compensate for being ${todayAttendance.lateMinutes} minutes late.`
                    : 'Great dedication! Extra hours worked beyond shift end.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Log</CardTitle>
          <CardDescription>Records for today and the previous days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                      <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                      <span className="ml-2 text-gray-500">Loading...</span>
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
                  <TableCell className="text-gray-500">{todayAttendance?.shiftStartTime || userShift?.startTime || '-'}</TableCell>
                  <TableCell>{todayAttendance?.checkOut?.time || '-'}</TableCell>
                  <TableCell className="text-right">
                    {todayAttendance?.isOvertime ? (
                      <span className="text-purple-600 font-medium">{todayAttendance?.totalHours} hrs (+{todayAttendance?.overtimeHours} OT)</span>
                    ) : (
                      <span>{todayAttendance?.totalHours || '-'} hrs</span>
                    )}
                  </TableCell>
                </TableRow>
              ) : filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasRole(["admin", "hr"]) ? 8 : 6} className="text-center py-8 text-gray-500">
                    No attendance records found.
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
                          <div className="font-medium text-gray-900">{log.employeeName}</div>
                          <div className="text-xs text-gray-500">{log.department}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <StatusBadge status={log.status} isLate={log.isLate} isOvertime={log.isOvertime} />
                      </TableCell>
                      <TableCell>{checkInTime}</TableCell>
                      <TableCell className="text-gray-500">{log.shiftStartTime || '-'}</TableCell>
                      <TableCell>{checkOutTime}</TableCell>
                      <TableCell className="text-right">
                        {log.isOvertime ? (
                          <span className="text-purple-600 font-medium">{log.totalHours} hrs (+{log.overtimeHours} OT)</span>
                        ) : (
                          <span>{log.totalHours ? `${log.totalHours} hrs` : calculateHours(checkInTime, checkOutTime)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-blue-600"
                            onClick={() => setEditingRecord(log)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
              <h3 className="font-bold text-lg">Edit Attendance</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingRecord(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <form onSubmit={handleUpdateRecord} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Employee</label>
                <div className="font-semibold">{editingRecord.employeeName}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Check In</label>
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
                  <label className="text-sm font-medium">Check Out</label>
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
                <label className="text-sm font-medium">Status Override (Optional)</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-gray-800 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="text-sm font-medium">Work Mode</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-white dark:bg-gray-800 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
      )}
    </div>
  );
}
