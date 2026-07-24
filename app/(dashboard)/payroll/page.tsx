"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  IndianRupee, 
  Calendar, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Search,
  RefreshCw,
  MoreVertical,
  Printer,
  ChevronDown,
  Filter,
  Edit,
  Save,
  X,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PayrollPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingPayroll, setEditingPayroll] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    bonus: 0,
    otherDeductions: 0,
    note: '',
    netSalary: 0
  });

  // Settings State
  const [payrollCycleDate, setPayrollCycleDate] = useState(28);
  const [overtimeRate, setOvertimeRate] = useState(1.5);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // View State
  const [viewingPayroll, setViewingPayroll] = useState<any | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  useEffect(() => {
    if (user?.companyId) {
      fetchPayrolls();
      fetchSettings();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/company/payroll-settings?companyId=${user?.companyId}`);
      const data = await res.json();
      if (res.ok) {
        setPayrollCycleDate(data.payrollCycleDate);
        setOvertimeRate(data.overtimeRate || 1.5);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?companyId=${user?.companyId}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setPayrolls(data);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to load payroll records' });
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          companyId: user?.companyId
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        addToast({ type: 'success', title: 'Generated', description: data.message });
        fetchPayrolls();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, paymentDate: status === 'Paid' ? new Date() : undefined })
      });
      
      if (res.ok) {
        addToast({ type: 'success', title: 'Updated', description: `Status set to ${status}` });
        setPayrolls(prev => prev.map(p => p._id === id ? { ...p, status } : p));
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update status' });
    }
  };
  
  const handleRefresh = async (id: string) => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'refresh' })
      });
      
      if (res.ok) {
        addToast({ type: 'success', title: 'Refreshed', description: 'Payroll recalculation complete.' });
        fetchPayrolls();
      } else {
        const data = await res.json();
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', description: error.message || 'Failed to refresh payroll' });
    }
  };

  const openEditModal = (payroll: any) => {
    setEditingPayroll(payroll);
    setEditFormData({
      bonus: payroll.bonus || 0,
      otherDeductions: payroll.otherDeductions || 0,
      note: payroll.note || '',
      netSalary: payroll.netSalary
    });
  };

  const handleEditChange = (field: string, value: any) => {
    const newData = { ...editFormData, [field]: value };
    
    // Auto-calculate netSalary if digits change
    if (field === 'bonus' || field === 'otherDeductions') {
      const bonus = field === 'bonus' ? Number(value) : Number(editFormData.bonus);
      const otherDeductions = field === 'otherDeductions' ? Number(value) : Number(editFormData.otherDeductions);
      
      // Net = Original Base + OT - Late - Leave + Bonus - OtherDeductions
      // We'll calculate it relative to the existing net for safety or re-calculate from scratch
      const basePay = editingPayroll.baseSalary + editingPayroll.overtimePay - editingPayroll.lateDeduction - editingPayroll.leaveDeduction;
      newData.netSalary = basePay + bonus - otherDeductions;
    }
    
    setEditFormData(newData);
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayroll._id,
          ...editFormData
        })
      });
      
      if (res.ok) {
        addToast({ type: 'success', title: 'Saved', description: 'Payroll record updated manually.' });
        setEditingPayroll(null);
        fetchPayrolls();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to save edits' });
    }
  };

  const handleSettingsSave = async () => {
    try {
      setIsUpdatingSettings(true);
      const res = await fetch('/api/company/payroll-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: user?.companyId,
          payrollCycleDate,
          overtimeRate
        })
      });
      
      if (res.ok) {
        addToast({ type: 'success', title: 'Updated', description: 'Monthly generation schedule updated.' });
        setShowSettings(false);
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update schedule' });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const filteredPayrolls = payrolls.filter(p => 
    p.employeeId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employeeId?.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpense = filteredPayrolls.reduce((acc, curr) => acc + curr.netSalary, 0);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Payroll Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Review and manage monthly employee salaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowSettings(true)}
            className="gap-2 bg-white dark:bg-gray-800"
          >
            <SettingsIcon size={16} /> Schedule
          </Button>
          <Button variant="outline" className="gap-2 bg-white dark:bg-gray-800">
            <Printer size={16} /> Print Report
          </Button>
          <Button onClick={generatePayroll} disabled={isGenerating} className="gap-2">
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp size={16} />}
            Generate Payroll
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-blue-600 text-white border-none shadow-lg shadow-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Net Salary</p>
                <div className="text-3xl font-bold flex items-center">
                  <IndianRupee size={24} className="mr-1" />
                  {totalExpense.toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle size={16} className="text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPayrolls.filter(p => p.status !== 'Paid').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Need review or payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Payrolls</CardTitle>
            <CheckCircle2 size={16} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPayrolls.filter(p => p.status === 'Paid').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Successfully paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border rounded-lg px-3 py-1 bg-white dark:bg-gray-800">
                <Calendar size={16} className="text-gray-500" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search employee..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-64 dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter size={14} /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/20 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold italic">Employee</th>
                  <th className="px-6 py-4 font-semibold italic">Base Salary</th>
                  <th className="px-6 py-4 font-semibold italic">Additions</th>
                  <th className="px-6 py-4 font-semibold italic">Deductions</th>
                  <th className="px-6 py-4 font-semibold italic">Net Pay</th>
                  <th className="px-6 py-4 font-semibold italic">Status</th>
                  <th className="px-6 py-4 font-semibold italic text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                        <p>Loading payroll records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-gray-300" />
                        <p>No payroll records found for this period.</p>
                        <Button variant="outline" onClick={generatePayroll} size="sm" className="mt-2">
                          Generate Now
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayrolls.map((payroll) => (
                    <tr key={payroll._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {payroll.employeeId?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{payroll.employeeId?.name}</p>
                            <p className="text-[10px] text-gray-500">{payroll.employeeId?.department} • {payroll.employeeId?.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">₹{payroll.baseSalary.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <TrendingUp size={10} />
                            <span>
                              OT: {payroll.overtimePay > 0 
                                ? `₹${payroll.overtimePay.toLocaleString()}` 
                                : payroll.overtimeHours > 0 
                                  ? `${payroll.overtimeHours}h (Comp-Off)` 
                                  : '₹0'}
                            </span>
                          </div>
                          {payroll.bonus > 0 && (
                            <div className="text-[10px] text-green-500 italic">+ Bonus</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-red-600 text-xs text-italic">
                            <TrendingDown size={10} />
                            <span>Late: ₹{payroll.lateDeduction.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-orange-600 text-xs text-italic">
                            <Clock size={10} />
                            <span>Leave: ₹{payroll.leaveDeduction.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-blue-600 dark:text-blue-400">
                          ₹{payroll.netSalary.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            payroll.status === 'Paid' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {payroll.status}
                          </span>
                          {payroll.isManualEdit && (
                            <div title="Manually Edited">
                              <ShieldAlert size={14} className="text-blue-500" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-500"
                            onClick={() => setViewingPayroll(payroll)}
                            title="View Breakdown"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600"
                            onClick={() => openEditModal(payroll)}
                            title="Edit Record"
                          >
                            <Edit size={16} />
                          </Button>
                          {payroll.status !== 'Paid' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-orange-500 hover:text-orange-600"
                              onClick={() => handleRefresh(payroll._id)}
                              title="Refresh Payroll (Recalculate)"
                            >
                              <RefreshCw size={14} />
                            </Button>
                          )}
                          {payroll.status !== 'Paid' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateStatus(payroll._id, 'Paid')} 
                              className="h-8 px-3 text-[10px] font-bold bg-green-600 hover:bg-green-700"
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Modal */}
      {viewingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                  {viewingPayroll.employeeId?.name ? viewingPayroll.employeeId.name.charAt(0) : '?'}
                </div>
                <div>
                  <CardTitle className="text-lg">Salary Breakdown</CardTitle>
                  <CardDescription>{viewingPayroll.employeeId?.name || 'Unknown Employee'} • {months[viewingPayroll.month]} {viewingPayroll.year}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingPayroll(null)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Earnings */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-green-600 dark:text-green-400 border-b pb-2 flex items-center gap-2">
                    <TrendingUp size={16} /> Earnings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Base Salary</span>
                      <span className="font-semibold">₹{viewingPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Overtime Pay</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.overtimeHours}h × (Rate × {overtimeRate})
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {viewingPayroll.overtimePay > 0 ? `+ ₹${viewingPayroll.overtimePay.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    {viewingPayroll.bonus > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Bonus Additions</span>
                        <span className="font-semibold text-green-600">+ ₹{viewingPayroll.bonus.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between items-center font-bold">
                      <span>Total Earnings</span>
                      <span className="text-green-600">₹{(viewingPayroll.baseSalary + viewingPayroll.overtimePay + viewingPayroll.bonus).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-red-600 dark:text-red-400 border-b pb-2 flex items-center gap-2">
                    <TrendingDown size={16} /> Deductions
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Late Arriving</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.totalLateMinutes} mins late
                        </span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {viewingPayroll.lateDeduction > 0 ? `- ₹${viewingPayroll.lateDeduction.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Unpaid Leaves</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.unpaidLeaves} days approved
                        </span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {viewingPayroll.leaveDeduction > 0 ? `- ₹${viewingPayroll.leaveDeduction.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    {viewingPayroll.otherDeductions > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Manual Deductions</span>
                        <span className="font-semibold text-red-600">- ₹{viewingPayroll.otherDeductions.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between items-center font-bold">
                      <span>Total Deductions</span>
                      <span className="text-red-600">₹{(viewingPayroll.lateDeduction + viewingPayroll.leaveDeduction + viewingPayroll.otherDeductions).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="mt-8 p-6 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest">Net Payable Salary</p>
                    <p className="text-4xl font-black mt-1 flex items-center">
                      <IndianRupee size={32} />
                      {viewingPayroll.netSalary.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-xs italic">Status</p>
                    <p className="inline-block mt-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold">
                      {viewingPayroll.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setViewingPayroll(null)}>Close Window</Button>
                <Button className="flex-1 gap-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50" onClick={() => {
                  const p = viewingPayroll;
                  setViewingPayroll(null);
                  openEditModal(p);
                }}>
                  <Edit size={16} /> Adjust Figures
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Edit Payroll Record</CardTitle>
                <CardDescription>{editingPayroll.employeeId?.name} • {months[editingPayroll.month]} {editingPayroll.year}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingPayroll(null)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Bonus (₹)</label>
                  <input 
                    type="number" 
                    value={editFormData.bonus}
                    onChange={(e) => handleEditChange('bonus', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Other Deductions (₹)</label>
                  <input 
                    type="number" 
                    value={editFormData.otherDeductions}
                    onChange={(e) => handleEditChange('otherDeductions', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-red-600"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Notes / Remarks</label>
                <textarea 
                  value={editFormData.note}
                  onChange={(e) => handleEditChange('note', e.target.value)}
                  placeholder="Reason for manual adjustment..."
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-blue-800 dark:text-blue-300">Final Calculated Net Salary</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{editFormData.netSalary.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-blue-500 mt-1 italic">
                  * includes base salary, OT additions, and late/leave deductions.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setEditingPayroll(null)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleEditSave}>
                  <Save size={16} /> Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Modal (Cycle Date) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-blue-600" />
                <CardTitle className="text-lg">Payroll Schedule</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Monthly Generation Date
                </label>
                <div className="flex items-center gap-4">
                  <select 
                    value={payrollCycleDate}
                    onChange={(e) => setPayrollCycleDate(Number(e.target.value))}
                    className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} of the month</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  Payroll will be automatically generated for all employees on this date every month.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Overtime Multiplier (x)
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    step="0.1" 
                    min="1" 
                    max="5"
                    value={overtimeRate}
                    onChange={(e) => setOvertimeRate(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  The hourly rate will be multiplied by this value for overtime calculations (e.g., 1.5 for time-and-a-half).
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>Cancel</Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleSettingsSave}
                  disabled={isUpdatingSettings}
                >
                  {isUpdatingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  Save Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
