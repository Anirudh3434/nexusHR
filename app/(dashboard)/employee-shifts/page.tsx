"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getEmployeesByShift, updateEmployeeShift, Employee } from "../../../services/employeeShiftService";
import { getShifts, WorkShift } from "../../../services/shiftService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Loader2, Users, Clock, DollarSign, ArrowRightLeft, UserCheck, Sun, Moon } from "lucide-react";

export default function EmployeeShiftsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [isAssigning, setIsAssigning] = useState(false);

  const canManage = hasRole(["admin", "hr", "manager"]);

  useEffect(() => {
    if (user?.companyId) {
      fetchData();
    }
  }, [user, selectedShift]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empData, shiftData] = await Promise.all([
        getEmployeesByShift({ 
          companyId: user!.companyId!, 
          shiftId: selectedShift === 'all' ? undefined : selectedShift 
        }),
        getShifts(user!.companyId!)
      ]);
      setEmployees(empData);
      setShifts(shiftData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignShift = async (employeeId: string, shiftId: string | null) => {
    if (!canManage) return;
    
    setIsAssigning(true);
    try {
      await updateEmployeeShift(employeeId, shiftId);
      addToast({ 
        type: "success", 
        title: "Success", 
        description: shiftId ? "Shift assigned successfully" : "Shift removed successfully" 
      });
      fetchData();
    } catch (error) {
      console.error("Failed to assign shift:", error);
      addToast({ type: "error", title: "Error", description: "Failed to assign shift" });
    } finally {
      setIsAssigning(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group employees by shift
  const unassignedEmployees = employees.filter(e => !e.workShiftId);
  const shiftGroups = shifts.map(shift => ({
    shift,
    employees: employees.filter(e => e.workShiftId?._id === shift._id)
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Employee Shift Assignment
          </h1>
          <p className="text-gray-500">Manage employee work schedules and view salary information</p>
        </div>
        
        {/* Filter */}
        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="all">All Employees</option>
          <option value="unassigned">Unassigned</option>
          {shifts.map(shift => (
            <option key={shift._id} value={shift._id}>{shift.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Assigned</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.workShiftId).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unassigned</p>
                <p className="text-2xl font-bold">{unassignedEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Salary</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(employees.reduce((sum, e) => sum + (e.salary || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Section */}
      {(selectedShift === 'all' || selectedShift === 'unassigned') && unassignedEmployees.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Clock className="h-5 w-5" />
              Unassigned Employees ({unassignedEmployees.length})
            </CardTitle>
            <CardDescription className="text-red-600">
              These employees don't have a shift assigned
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {unassignedEmployees.map(emp => (
                <div key={emp._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-gray-500">{emp.employeeId} • {emp.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(emp.salary)}</p>
                      <p className="text-xs text-gray-500">{emp.designation}</p>
                    </div>
                    {canManage && (
                      <select
                        value=""
                        onChange={(e) => handleAssignShift(emp._id, e.target.value)}
                        disabled={isAssigning}
                        className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                      >
                        <option value="">Assign Shift...</option>
                        {shifts.map(shift => (
                          <option key={shift._id} value={shift._id}>{shift.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Groups */}
      {shiftGroups.map(({ shift, employees: shiftEmployees }) => {
        if (selectedShift !== 'all' && selectedShift !== 'unassigned' && selectedShift !== shift._id) return null;
        if (shiftEmployees.length === 0 && selectedShift !== 'all') return null;
        
        const isNightShift = shift.name.toLowerCase().includes('night');
        
        return (
          <Card key={shift._id} className={isNightShift ? 'border-indigo-200' : ''}>
            <CardHeader className={isNightShift ? 'bg-indigo-50' : 'bg-blue-50'}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isNightShift ? <Moon className="h-5 w-5 text-indigo-600" /> : <Sun className="h-5 w-5 text-amber-600" />}
                    {shift.name}
                  </CardTitle>
                  <CardDescription>
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)} • {shift.workingDays.length} days/week
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{shiftEmployees.length}</p>
                  <p className="text-sm text-gray-500">employees</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {shiftEmployees.length > 0 ? (
                <div className="divide-y">
                  {shiftEmployees.map(emp => (
                    <div key={emp._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isNightShift ? 'bg-indigo-100' : 'bg-blue-100'}`}>
                          <span className="text-sm font-medium">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-gray-500">{emp.employeeId} • {emp.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">{formatCurrency(emp.salary)}</p>
                          <p className="text-xs text-gray-500">{emp.designation}</p>
                        </div>
                        {canManage && (
                          <select
                            value={shift._id}
                            onChange={(e) => handleAssignShift(emp._id, e.target.value || null)}
                            disabled={isAssigning}
                            className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                          >
                            <option value="">Remove</option>
                            {shifts.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No employees assigned to this shift</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
