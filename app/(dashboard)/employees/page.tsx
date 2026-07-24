"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getEmployees, Employee } from "../../../services/employeeService";
import { getShifts, WorkShift } from "../../../services/shiftService";
import { getDepartments, Department } from "../../../services/departmentService";
import { getDesignations, Designation } from "../../../services/designationService";
import { getLeaveTypes, LeaveType } from "../../../services/leaveTypeService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Stepper } from "../../../components/ui/Stepper";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { X, Plus, Loader2, Users, Briefcase, DollarSign, Clock, Pencil, ChevronLeft, ChevronRight, Sun, Moon, MapPinOff } from "lucide-react";

export default function EmployeesPage() {
  const { user, loading, hasRole } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Add Employee Modal
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    designation: '',
    workShiftId: '',
    salary: '',
    phone: '',
    joiningDate: new Date().toISOString().split('T')[0],
    leaveBalances: {} as Record<string, number>, // leaveTypeId -> allocated days
  });

  // Edit Employee Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    department: '',
    designation: '',
    workShiftId: '',
    salary: '',
    phone: '',
    status: 'Active',
    isGeoFencingExempt: false,
    geoFencingExemptUntil: '' as string | undefined,
    overtimePreference: 'payroll',
  });

  useEffect(() => {
    if (!loading && user && !hasRole(["admin", "hr"])) {
      router.push("/unauthorized");
    }
  }, [user, loading, hasRole, router]);

  useEffect(() => {
    if (user && hasRole(["admin", "hr"])) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [empData, shiftData, deptData, desigData] = await Promise.all([
        getEmployees(user?.companyId || ''),
        getShifts(user?.companyId || ''),
        getDepartments(user?.companyId || ''),
        getDesignations(user?.companyId || '')
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setDepartments(deptData);
      setDesignations(desigData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary: Number(formData.salary),
          companyId: user?.companyId || null,
          isActive: true,
          status: 'Active',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        addToast({ type: 'error', title: 'Error', description: data.message || 'Failed to create employee' });
      } else {
        addToast({ type: 'success', title: 'Success', description: 'Employee onboarded successfully' });
        resetForm();
        fetchData();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmployee.id,
          ...editFormData,
          salary: Number(editFormData.salary),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        addToast({ type: 'error', title: 'Error', description: data.message || 'Failed to update employee' });
      } else {
        addToast({ type: 'success', title: 'Success', description: 'Employee updated successfully' });
        setShowEditModal(false);
        setEditingEmployee(null);
        fetchData();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (employee: Employee) => {
    console.log('[Frontend] Opening modal for:', employee.name, {
      isGeoFencingExempt: employee.isGeoFencingExempt,
      until: employee.geoFencingExemptUntil,
      now: new Date().toISOString()
    });
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name,
      department: employee.department || '',
      designation: employee.designation || '',
      workShiftId: employee.workShiftId || '',
      salary: employee.salary?.toString() || '',
      phone: employee.phone || '',
      status: employee.status || 'Active',
      isGeoFencingExempt: !!employee.isGeoFencingExempt,
      geoFencingExemptUntil: employee.geoFencingExemptUntil ? 
        (typeof employee.geoFencingExemptUntil === 'string' ? 
          employee.geoFencingExemptUntil : 
          employee.geoFencingExemptUntil.toISOString()) : '',
      overtimePreference: employee.overtimePreference || 'payroll',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setStep(1);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      designation: '',
      workShiftId: '',
      salary: '',
      phone: '',
      joiningDate: new Date().toISOString().split('T')[0],
      leaveBalances: {},
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getShiftName = (shiftId?: string) => {
    if (!shiftId) return '-';
    const shift = shifts.find(s => s._id === shiftId);
    return shift?.name || '-';
  };

  if (loading || !user || !hasRole(["admin", "hr"])) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Employees
          </h1>
          <p className="text-gray-500">Manage your workforce, assign shifts and salaries.</p>
        </div>
        {user.role === "admin" && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>A list of all users in your organization with shift and salary info.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: Employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="flex items-center gap-3">
                      {employee.avatar ? (
                        <img src={employee.avatar} alt={employee.name} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {employee.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{employee.role}</div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>{employee.designation || "-"}</TableCell>
                    <TableCell>{getShiftName(employee.workShiftId)}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(employee.salary)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        employee.status === 'Active' || employee.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status || (employee.isActive ? 'Active' : 'Inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(employee)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Onboarding Modal with Stepper */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Onboard New Employee</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <Stepper 
              steps={[
                { title: 'Basic Info', description: 'Personal details' },
                { title: 'Work Info', description: 'Department & shift' },
                { title: 'Salary', description: 'Compensation' }
              ]} 
              currentStep={step - 1} 
              className="px-6 py-4" 
            />

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Work Info */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value, designation: ''})}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                      {departments.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No departments found. Create in Department Mgmt.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                      <select
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={!formData.department}
                      >
                        <option value="">
                          {formData.department ? "Select Designation" : "Select Department First"}
                        </option>
                        {designations
                          .filter((d) => !formData.department || d.department === formData.department || !d.department)
                          .map((desig) => (
                            <option key={desig._id} value={desig.name}>{desig.name}</option>
                          ))}
                      </select>
                      {formData.department && designations.filter(d => d.department === formData.department || !d.department).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No designations for this dept. Create in Designations.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                      <Input
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Shift</label>
                      <div className="grid grid-cols-2 gap-3">
                        {shifts.map((shift) => {
                          const isNight = shift.name.toLowerCase().includes('night');
                          const isSelected = formData.workShiftId === shift._id;
                          return (
                            <button
                              key={shift._id}
                              type="button"
                              onClick={() => setFormData({...formData, workShiftId: shift._id})}
                              className={`p-3 border rounded-lg text-left transition-all ${
                                isSelected 
                                  ? isNight 
                                    ? 'border-indigo-500 bg-indigo-50' 
                                    : 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isNight ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-600" />}
                                <span className="font-medium text-sm">{shift.name}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{shift.startTime} - {shift.endTime}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Salary */}
              {step === 3 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                        <Input
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({...formData, salary: e.target.value})}
                          placeholder="50000"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-blue-50">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Salary Summary</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Basic Salary</span>
                        <span className="font-bold">₹{formData.salary ? Number(formData.salary).toLocaleString() : '0'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-100/50">
                        <span className="text-gray-500">Selected Shift</span>
                        <span className="font-medium text-gray-700">{getShiftName(formData.workShiftId)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Department</span>
                        <span className="font-medium text-gray-700">{formData.department || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Role</span>
                        <span className="capitalize font-medium text-gray-700">{formData.role}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                {step < 3 ? (
                  <Button type="button" className="flex-1" onClick={() => setStep(step + 1)}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Employee'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Employee</h2>
              <button onClick={() => { setShowEditModal(false); setEditingEmployee(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({...editFormData, department: e.target.value, designation: ''})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({...editFormData, designation: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Designation</option>
                    {designations
                      .filter((d) => !editFormData.department || d.department === editFormData.department || !d.department)
                      .map((desig) => (
                        <option key={desig._id} value={desig.name}>{desig.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Shift</label>
                  <select
                    value={editFormData.workShiftId}
                    onChange={(e) => setEditFormData({...editFormData, workShiftId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((shift) => (
                      <option key={shift._id} value={shift._id}>{shift.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                    <Input
                      type="number"
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({...editFormData, salary: e.target.value})}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${editFormData.isGeoFencingExempt ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        <MapPinOff size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Disable Geo-fencing Today</p>
                        <p className="text-[10px] text-gray-500">Automatically re-enables tomorrow at 12:00 AM</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={editFormData.isGeoFencingExempt}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          let geoFencingExemptUntil = undefined;
                          if (checked) {
                            // Set to end of current day (23:59:59)
                            const endOfDay = new Date();
                            endOfDay.setHours(23, 59, 59, 999);
                            geoFencingExemptUntil = endOfDay.toISOString();
                          }
                          setEditFormData({
                            ...editFormData, 
                            isGeoFencingExempt: checked,
                            geoFencingExemptUntil: geoFencingExemptUntil
                          });
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => { setShowEditModal(false); setEditingEmployee(null); }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
