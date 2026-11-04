"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { PageHeader } from "../../../components/ui/PageHeader";
import { CalendarClock, Loader2 } from "lucide-react";
import { WeekWiseAttendanceTable } from "../../../components/attendance/WeekWiseAttendanceTable";
import { getAttendance, AttendanceRecord } from "../../../services/attendanceService";
import { getEmployees, Employee } from "../../../services/employeeService";

export default function TeamAttendancePage() {
  const { user, loading } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId) {
      fetchTeamAttendance();
    }
  }, [user?.companyId]);

  const fetchTeamAttendance = async () => {
    try {
      setDataLoading(true);
      const [attData, empData] = await Promise.all([
        getAttendance({ companyId: user?.companyId }),
        getEmployees(user?.companyId).catch(() => []),
      ]);
      setAttendance(attData);
      setEmployees(empData);
    } catch (error) {
      console.error("Failed to fetch team attendance:", error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        icon={<CalendarClock />} 
        title="Team Attendance Matrix" 
        description="Weekly cross-department attendance matrix and timesheet overview."
      />
      
      <WeekWiseAttendanceTable
        attendance={attendance}
        employees={employees}
        isAdminOrHr={true}
        currentUser={user}
      />
    </div>
  );
}
