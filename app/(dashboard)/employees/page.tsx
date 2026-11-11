"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getEmployees, bulkImportEmployees, Employee } from "../../../services/employeeService";
import { getShifts, WorkShift } from "../../../services/shiftService";
import { getDepartments, Department } from "../../../services/departmentService";
import { getDesignations, Designation } from "../../../services/designationService";
import { getLeaveTypes, LeaveType } from "../../../services/leaveTypeService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Stepper } from "../../../components/ui/Stepper";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Input } from "../../../components/ui/Input";
import { Avatar } from "../../../components/ui/Avatar";
import { getProbationInfo, probationLabel, probationPhaseClasses } from "../../../lib/probation";
import { 
  X, 
  Plus, 
  Loader2, 
  Users, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  MapPinOff, 
  Upload,
  Eye,
  Mail,
  Phone,
  Calendar,
  Landmark,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink
} from "lucide-react";
import { CsvImportModal } from "../../../components/ui/CsvImportModal";
import { EMPLOYEE_CSV_TEMPLATE, parseEmployeeCSV, ParsedEmployeeRow } from "../../../lib/csvUtils";

function ProbationBadge({ employee }: { employee: Employee }) {
  const info = getProbationInfo({
    probationStatus: employee.probationStatus ?? null,
    probationStartDate: employee.probationStartDate ?? null,
    probationEndDate: employee.probationEndDate ?? null,
    probationMonths: employee.probationMonths ?? null,
  });
  if (info.phase === "none") return null;
  return (
    <span
      className={`mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${probationPhaseClasses(info.phase)}`}
    >
      {info.phase === "confirmed" ? "Confirmed" : `Probation · ${probationLabel(info)}`}
    </span>
  );
}

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
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

  // View Employee Profile Modal State
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [viewingBankDetail, setViewingBankDetail] = useState<any | null>(null);
  const [loadingBankDetail, setLoadingBankDetail] = useState(false);

  const openViewProfile = async (emp: Employee) => {
    setViewingEmployee(emp);
    setViewingBankDetail(null);
    setLoadingBankDetail(true);
    try {
      const res = await fetch(`/api/users/bank-details?userId=${emp.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingBankDetail(data.bankDetail || null);
      }
    } catch (e) {
      console.error('Failed to fetch employee bank details:', e);
    } finally {
      setLoadingBankDetail(false);
    }
  };

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
  }, [user?.companyId, user?.role]);

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
      <PageHeader
        icon={<Users />}
        title="Employees"
        description="Manage your workforce, assign shifts and salaries."
        actions={
          (user.role === "admin" || user.role === "hr") && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>
          )
        }
      />

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
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      title="No employees found"
                      description="Add your first employee, or adjust your search."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: Employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <TableCell>
                      <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => openViewProfile(employee)}
                        title="Click to view full employee profile"
                      >
                        <Avatar name={employee.name} src={employee.avatar} size="sm" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {employee.name}
                            <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{employee.role}</div>
                          <ProbationBadge employee={employee} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>{employee.designation || "-"}</TableCell>
                    <TableCell>{getShiftName(employee.workShiftId)}</TableCell>
                    <TableCell className="text-green-600 font-medium dark:text-green-400">
                      {formatCurrency(employee.salary)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        employee.status === 'Active' || employee.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
                      }`}>
                        {employee.status || (employee.isActive ? 'Active' : 'Inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2.5 text-xs font-medium text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 gap-1"
                          onClick={() => openViewProfile(employee)}
                          title="View Employee Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => openEditModal(employee)}
                          title="Edit Employee"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </div>
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
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-slate-100">Onboard New Employee</h2>
              <button onClick={resetForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
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
                        <p className="text-xs text-amber-600 mt-1 dark:text-amber-400">
                          No departments found. Create in Department Mgmt.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
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
                        <p className="text-xs text-amber-600 mt-1 dark:text-amber-400">
                          No designations for this dept. Create in Designations.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Joining Date</label>
                      <Input
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Shift</label>
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
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                                    : 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isNight ? <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                                <span className="font-medium text-sm">{shift.name}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{shift.startTime} - {shift.endTime}</p>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Salary (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">₹</span>
                        <Input
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({...formData, salary: e.target.value})}
                          placeholder="50000"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-blue-50">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 dark:text-blue-400">Salary Summary</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Basic Salary</span>
                        <span className="font-bold">₹{formData.salary ? Number(formData.salary).toLocaleString() : '0'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-100/50">
                        <span className="text-gray-500 dark:text-gray-400">Selected Shift</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{getShiftName(formData.workShiftId)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Department</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formData.department || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Role</span>
                        <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{formData.role}</span>
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
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Employee</h2>
              <button onClick={() => { setShowEditModal(false); setEditingEmployee(null); }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Shift</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Salary (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">₹</span>
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
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Disable Geo-fencing Today</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Automatically re-enables tomorrow at 12:00 AM</p>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 dark:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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

      {/* View Employee Profile Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
            {/* Header with decorative background */}
            <div className="relative p-6 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-gray-100 dark:border-slate-800">
              <button 
                onClick={() => setViewingEmployee(null)} 
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar name={viewingEmployee.name} src={viewingEmployee.avatar} size="lg" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{viewingEmployee.name}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      viewingEmployee.status === 'Active' || viewingEmployee.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
                    }`}>
                      {viewingEmployee.status || (viewingEmployee.isActive ? 'Active' : 'Inactive')}
                    </span>
                    <span className="capitalize inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {viewingEmployee.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {viewingEmployee.department || 'General'} • {viewingEmployee.designation || 'Staff'}
                  </p>
                  <ProbationBadge employee={viewingEmployee} />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* 1. Contact & Identity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <Mail size={12} /> Email Address
                  </span>
                  <a href={`mailto:${viewingEmployee.email}`} className="text-sm font-semibold text-primary hover:underline block truncate">
                    {viewingEmployee.email}
                  </a>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone size={12} /> Phone Number
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {viewingEmployee.phone || <span className="text-gray-400 italic font-normal">Not provided</span>}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> Work Shift
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {getShiftName(viewingEmployee.workShiftId)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <DollarSign size={12} /> Monthly Compensation
                  </span>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(viewingEmployee.salary)}
                  </p>
                </div>
              </div>

              {/* 2. Bank Details (AES-256 Vault) */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-slate-100">Salary Disbursement Account</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <Lock size={9} /> AES-256 Vault
                    </span>
                  </div>
                  {viewingBankDetail && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      viewingBankDetail.isVerified 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {viewingBankDetail.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {loadingBankDetail ? (
                    <div className="flex items-center justify-center py-4 text-xs text-gray-500 gap-2">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      Loading encrypted account details...
                    </div>
                  ) : viewingBankDetail ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Bank Name</span>
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{viewingBankDetail.bankName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Account Number</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-slate-100 mt-0.5">{viewingBankDetail.accountNumberMasked}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">IFSC Code</span>
                        <p className="font-mono font-semibold text-primary mt-0.5">{viewingBankDetail.ifscCode}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Account Holder</span>
                        <p className="font-medium text-gray-900 dark:text-slate-100 mt-0.5">{viewingBankDetail.accountHolderName}</p>
                      </div>
                      {viewingBankDetail.branchName && (
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Branch</span>
                          <p className="text-gray-700 dark:text-slate-300 mt-0.5">{viewingBankDetail.branchName}</p>
                        </div>
                      )}
                      {viewingBankDetail.upiIdMasked && (
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">UPI ID</span>
                          <p className="font-mono text-gray-700 dark:text-slate-300 mt-0.5">{viewingBankDetail.upiIdMasked}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-xs text-gray-500 dark:text-slate-400">
                      <Landmark className="h-6 w-6 mx-auto mb-1 text-gray-400 dark:text-gray-600" />
                      <p>No bank details registered yet.</p>
                      <p className="text-[11px] text-gray-400">The employee can add bank details from their Profile section.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs gap-1.5"
                onClick={() => {
                  router.push(`/profile?userId=${viewingEmployee.id}`);
                }}
              >
                <ExternalLink size={13} />
                <span>Open Full Profile Page</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => setViewingEmployee(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="w-full sm:w-auto text-xs gap-1"
                  onClick={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    openEditModal(emp);
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Employee</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal<ParsedEmployeeRow>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Employees from CSV"
        description="Bulk onboard staff members, assign departments, roles, and compensation."
        sampleFileName="employees_sample_template.csv"
        sampleContent={EMPLOYEE_CSV_TEMPLATE}
        rowParser={parseEmployeeCSV}
        columns={[
          {
            header: "Employee ID",
            accessor: (row) => <span className="font-mono text-slate-500">{row.employeeId || "—"}</span>,
          },
          {
            header: "Full Name",
            accessor: (row) => (
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {row.name || <span className="text-red-500 italic">Missing name</span>}
              </span>
            ),
          },
          {
            header: "Email Address",
            accessor: (row) => (
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                {row.email || <span className="text-red-500 italic">Missing email</span>}
              </span>
            ),
          },
          {
            header: "Role",
            accessor: (row) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 capitalize">
                {row.role}
              </span>
            ),
          },
          {
            header: "Department",
            accessor: (row) => <span>{row.department || "—"}</span>,
          },
          {
            header: "Designation",
            accessor: (row) => <span>{row.designation || "—"}</span>,
          },
          {
            header: "Salary",
            accessor: (row) => <span>{row.salary ? formatCurrency(row.salary) : "—"}</span>,
          },
        ]}
        onImport={async (validRows) => {
          const res = await bulkImportEmployees(
            validRows.map((r) => ({
              employeeId: r.employeeId,
              name: r.name,
              email: r.email,
              role: r.role,
              department: r.department,
              designation: r.designation,
              phone: r.phone,
              salary: r.salary,
              joiningDate: r.joiningDate,
              password: r.password,
            })),
            user?.companyId
          );
          addToast({
            type: "success",
            title: "Import Finished",
            description: `${res.importedCount} employees onboarded successfully${res.skippedCount > 0 ? `, ${res.skippedCount} skipped` : ""}.`,
          });
          return res;
        }}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}

