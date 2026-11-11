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
  Eye,
  CircleDollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';

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
      <PageHeader
        icon={<CircleDollarSign />}
        title="Payroll Management"
        description="Review and manage monthly employee salaries."
        actions={
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="gap-1.5 text-xs bg-white dark:bg-gray-800"
            >
              <SettingsIcon size={14} /> Schedule
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1.5 text-xs bg-white dark:bg-gray-800"
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print Report
            </Button>
            <Button 
              onClick={generatePayroll} 
              disabled={isGenerating} 
              size="sm"
              className="gap-1.5 text-xs col-span-2 sm:col-span-1"
            >
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp size={14} />}
              Generate Payroll
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="col-span-2 md:col-span-1 bg-primary text-primary-foreground border-none shadow-md shadow-primary/20">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 min-w-0">
                <p className="text-primary-foreground/80 text-[11px] sm:text-xs font-medium uppercase tracking-wider">Total Net Salary</p>
                <div className="text-xl sm:text-3xl font-bold flex items-center truncate">
                  <IndianRupee size={20} className="mr-0.5 shrink-0" />
                  <span>{totalExpense.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-2 bg-white/10 rounded-lg shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Pending</p>
              <AlertCircle size={16} className="text-orange-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1">
              {filteredPayrolls.filter(p => p.status !== 'Paid').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 dark:text-slate-400 truncate">Needs review/pay</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Processed</p>
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1">
              {filteredPayrolls.filter(p => p.status === 'Paid').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 dark:text-slate-400 truncate">Successfully paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="rounded-[14px] border border-border shadow-xs">
        <CardHeader className="p-3.5 sm:p-4 border-b bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            <div className="flex items-center justify-between sm:justify-start border rounded-xl px-3 py-1.5 bg-background shadow-xs w-full sm:w-auto">
              <div className="flex items-center">
                <Calendar size={16} className="text-primary mr-1 shrink-0" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-none text-xs sm:text-sm focus:ring-0 cursor-pointer text-foreground font-medium outline-none"
                >
                  {months.map((m, i) => <option key={m} value={i} className="bg-card text-foreground">{m}</option>)}
                </select>
              </div>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-xs sm:text-sm focus:ring-0 cursor-pointer text-foreground font-medium outline-none border-l border-border pl-2"
              >
                {years.map(y => <option key={y} value={y} className="bg-card text-foreground">{y}</option>)}
              </select>
            </div>
            <div className="relative flex-1 w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search employee or dept..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-border rounded-xl text-xs sm:text-sm w-full bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-gray-500 dark:text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-sm font-medium">Loading payroll records...</p>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No payroll records found for this period."
                description="Generate payroll for this period to see records."
                icon={<AlertCircle size={18} />}
                action={
                  <Button variant="outline" onClick={generatePayroll} size="sm">
                    Generate Now
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="space-y-3 p-3.5 md:hidden">
                {filteredPayrolls.map((payroll) => (
                  <div
                    key={payroll._id}
                    className="rounded-lg border border-border bg-card p-3.5 space-y-3 shadow-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {payroll.employeeId?.name ? payroll.employeeId.name.charAt(0) : "E"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {payroll.employeeId?.name || "Employee"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {payroll.employeeId?.department} • {payroll.employeeId?.designation}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          payroll.status === 'Paid' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : payroll.status === 'Reviewed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {payroll.status === 'Reviewed' ? 'Verified' : payroll.status}
                        </span>
                        {payroll.isManualEdit && (
                          <div title="Manually Edited">
                            <ShieldAlert size={14} className="text-blue-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Net Pay Highlight */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="text-xs font-medium text-muted-foreground">Net Pay</span>
                      <span className="text-base font-bold text-primary flex items-center font-mono">
                        ₹{payroll.netSalary.toLocaleString()}
                      </span>
                    </div>

                    {/* 3-Column Breakdown */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/30 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Base Salary</p>
                        <p className="font-mono font-semibold text-foreground mt-0.5">₹{payroll.baseSalary.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-medium">Additions</p>
                        <p className="font-mono font-semibold text-green-600 dark:text-green-400 mt-0.5">
                          {payroll.overtimePay > 0 ? `+₹${payroll.overtimePay.toLocaleString()}` : '₹0'}
                          {payroll.bonus > 0 && <span className="text-[10px] block font-sans">+Bonus</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-red-600 dark:text-red-400 uppercase font-medium">Deductions</p>
                        <p className="font-mono font-semibold text-red-600 dark:text-red-400 mt-0.5">
                          -₹{(payroll.lateDeduction + payroll.leaveDeduction).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => setViewingPayroll(payroll)}
                          title="View Breakdown"
                        >
                          <Eye size={14} />
                          <span>Details</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 gap-1"
                          onClick={() => openEditModal(payroll)}
                          title="Edit Record"
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {payroll.status !== 'Paid' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600"
                              onClick={() => handleRefresh(payroll._id)}
                              title="Recalculate"
                            >
                              <RefreshCw size={13} />
                            </Button>
                            {payroll.status === 'Generated' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateStatus(payroll._id, 'Reviewed')} 
                                className="h-7 px-2 text-[10px] font-semibold text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400"
                              >
                                Verify
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => updateStatus(payroll._id, 'Paid')} 
                              className="h-7 px-2.5 text-[10px] font-bold"
                            >
                              Pay Now
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[750px]">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/20 border-b dark:text-slate-400">
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
                    {filteredPayrolls.map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                              {payroll.employeeId?.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{payroll.employeeId?.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-slate-400">{payroll.employeeId?.department} • {payroll.employeeId?.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">₹{payroll.baseSalary.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-green-600 text-xs dark:text-green-400">
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
                            <div className="flex items-center gap-1 text-red-600 text-xs text-italic dark:text-red-400">
                              <TrendingDown size={10} />
                              <span>Late: ₹{payroll.lateDeduction.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-orange-600 text-xs text-italic dark:text-orange-400">
                              <Clock size={10} />
                              <span>Leave: ₹{payroll.leaveDeduction.toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-primary">
                            ₹{payroll.netSalary.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              payroll.status === 'Paid' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : payroll.status === 'Reviewed'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {payroll.status === 'Reviewed' ? 'Verified' : payroll.status}
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
                              className="h-8 w-8 text-gray-500 dark:text-slate-400"
                              onClick={() => setViewingPayroll(payroll)}
                              title="View Breakdown"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 dark:text-blue-400"
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
                            {payroll.status === 'Generated' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateStatus(payroll._id, 'Reviewed')} 
                                className="h-8 px-2.5 text-[10px] font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                              >
                                Verify
                              </Button>
                            )}
                            {payroll.status !== 'Paid' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateStatus(payroll._id, 'Paid')} 
                                className="h-8 px-3 text-[10px] font-bold"
                              >
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Modal */}
      {viewingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
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
                      <span className="text-gray-500 dark:text-slate-400">Base Salary</span>
                      <span className="font-semibold">₹{viewingPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-slate-400">Overtime Pay</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.overtimeHours}h × (Rate × {overtimeRate})
                        </span>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {viewingPayroll.overtimePay > 0 ? `+ ₹${viewingPayroll.overtimePay.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    {viewingPayroll.bonus > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-slate-400">Bonus Additions</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">+ ₹{viewingPayroll.bonus.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between items-center font-bold">
                      <span>Total Earnings</span>
                      <span className="text-green-600 dark:text-green-400">₹{(viewingPayroll.baseSalary + viewingPayroll.overtimePay + viewingPayroll.bonus).toLocaleString()}</span>
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
                        <span className="text-gray-500 dark:text-slate-400">Late Arriving</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.totalLateMinutes} mins late
                        </span>
                      </div>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {viewingPayroll.lateDeduction > 0 ? `- ₹${viewingPayroll.lateDeduction.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-slate-400">Unpaid Leaves</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.unpaidLeaves} days approved
                        </span>
                      </div>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {viewingPayroll.leaveDeduction > 0 ? `- ₹${viewingPayroll.leaveDeduction.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    {viewingPayroll.otherDeductions > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-slate-400">Manual Deductions</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">- ₹{viewingPayroll.otherDeductions.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between items-center font-bold">
                      <span>Total Deductions</span>
                      <span className="text-red-600 dark:text-red-400">₹{(viewingPayroll.lateDeduction + viewingPayroll.leaveDeduction + viewingPayroll.otherDeductions).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="mt-8 p-6 bg-primary rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-widest">Net Payable Salary</p>
                    <p className="text-4xl font-black mt-1 flex items-center">
                      <IndianRupee size={32} />
                      {viewingPayroll.netSalary.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary-foreground/80 text-xs italic">Status</p>
                    <p className="inline-block mt-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold">
                      {viewingPayroll.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setViewingPayroll(null)}>Close Window</Button>
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer size={16} /> Print Payslip
                </Button>
                <Button className="flex-1 gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20" onClick={() => {
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
          <Card className="w-full max-w-md shadow-2xl border-primary/20 max-h-[90vh] overflow-y-auto">
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
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Bonus (₹)</label>
                  <input 
                    type="number" 
                    value={editFormData.bonus}
                    onChange={(e) => handleEditChange('bonus', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Other Deductions (₹)</label>
                  <input 
                    type="number" 
                    value={editFormData.otherDeductions}
                    onChange={(e) => handleEditChange('otherDeductions', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-red-600 dark:text-red-400"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Notes / Remarks</label>
                <textarea 
                  value={editFormData.note}
                  onChange={(e) => handleEditChange('note', e.target.value)}
                  placeholder="Reason for manual adjustment..."
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 min-h-[80px] focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-sm"
                />
              </div>

              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-foreground">Final Calculated Net Salary</span>
                  <span className="text-xl font-bold text-primary">₹{editFormData.netSalary.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 italic">
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
          <Card className="w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-primary" />
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
                    className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} of the month</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed italic dark:text-slate-400">
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
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed italic dark:text-slate-400">
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
