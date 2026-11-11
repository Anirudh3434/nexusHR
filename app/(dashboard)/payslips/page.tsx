"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  IndianRupee, 
  Calendar, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileText,
  TrendingUp,
  TrendingDown,
  Printer,
  CircleDollarSign,
  Eye,
  X,
  Building,
  User,
  CreditCard,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SmartLogoBadge } from '@/components/ui/SmartLogoBadge';

export default function PayslipsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchMyPayslips();
    }
  }, [user?.id]);

  const fetchMyPayslips = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?employeeId=${user?.id}&status=Paid`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPayrolls(data);
      } else {
        setPayrolls([]);
        if (data?.message && data.message !== 'Unauthorized') {
          console.warn('Payslips response:', data.message);
        }
      }
    } catch (error) {
      console.error('Failed to load payslips:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to load payslips' });
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month).toLocaleString('en-us', { month: 'long' });
  };

  const handlePrint = (payroll?: any) => {
    if (payroll) {
      setSelectedPayroll(payroll);
      setTimeout(() => {
        window.print();
      }, 250);
    } else {
      window.print();
    }
  };

  const availableYears = Array.from(
    new Set(payrolls.map((p) => p.year).filter(Boolean))
  ).sort((a, b) => b - a);

  const filteredPayrolls = payrolls.filter((p) => {
    const monthName = getMonthName(p.month).toLowerCase();
    const matchesSearch = monthName.includes(searchQuery.toLowerCase()) || 
      String(p.year).includes(searchQuery) ||
      (p.status && p.status.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesYear = selectedYear === 'all' || String(p.year) === selectedYear;
    return matchesSearch && matchesYear;
  });

  const latestPayroll = payrolls[0];
  const totalEarned = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CircleDollarSign />}
        title="My Payslips"
        description="View, download, and print your monthly salary statements."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest Net Pay</p>
              <h3 className="text-2xl font-bold mt-1 text-primary flex items-center">
                <IndianRupee size={20} className="mr-0.5" />
                {latestPayroll ? latestPayroll.netSalary.toLocaleString() : '0'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {latestPayroll ? `${getMonthName(latestPayroll.month)} ${latestPayroll.year}` : 'No records'}
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <CircleDollarSign size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Received</p>
              <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400 flex items-center">
                <IndianRupee size={20} className="mr-0.5" />
                {totalEarned.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Across {payrolls.length} payslip(s)</p>
            </div>
            <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
              <TrendingUp size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payslip Documents</p>
              <h3 className="text-2xl font-bold mt-1">{payrolls.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Available for download & print</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      {payrolls.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by month, year or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {availableYears.length > 1 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-card/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Payslips List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your payslips...</p>
          </div>
        ) : filteredPayrolls.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No payslips found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {payrolls.length === 0
                  ? 'No monthly salary statements have been generated for you yet.'
                  : 'No payslips match your search or filter criteria.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPayrolls.map((payroll) => (
            <Card 
              key={payroll._id} 
              className="overflow-hidden border-border/80 hover:border-primary/50 transition-all shadow-sm hover:shadow-md cursor-pointer group"
              onClick={() => setSelectedPayroll(payroll)}
            >
              <CardContent className="p-0">
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Month badge & Title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                      <span className="text-[10px] uppercase font-bold tracking-wider">{payroll.year}</span>
                      <span className="text-sm font-black italic">{getMonthName(payroll.month).slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        Payslip for {getMonthName(payroll.month)} {payroll.year}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          payroll.status === 'Paid' 
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {payroll.status}
                        </span>
                        {payroll.paymentDate && (
                          <span className="text-xs text-muted-foreground">
                            • Paid on {new Date(payroll.paymentDate).toLocaleDateString()}
                          </span>
                        )}
                        {payroll.paymentMethod && (
                          <span className="text-xs text-muted-foreground capitalize">
                            • via {payroll.paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Earnings, Deductions & Net Pay */}
                  <div className="grid grid-cols-3 gap-6 sm:gap-8 md:text-right">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gross Earnings</p>
                      <div className="text-sm font-semibold flex items-center md:justify-end text-emerald-600 dark:text-emerald-400">
                        <TrendingUp size={13} className="mr-1" />
                        ₹{(payroll.baseSalary + (payroll.overtimePay || 0) + (payroll.bonus || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Deductions</p>
                      <div className="text-sm font-semibold flex items-center md:justify-end text-rose-600 dark:text-rose-400">
                        <TrendingDown size={13} className="mr-1" />
                        ₹{((payroll.lateDeduction || 0) + (payroll.leaveDeduction || 0) + (payroll.otherDeductions || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Net Amount</p>
                      <div className="text-xl font-black text-primary flex items-center md:justify-end">
                        <IndianRupee size={18} className="mr-0.5" />
                        {payroll.netSalary.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="gap-1.5 h-9 font-semibold"
                      onClick={() => setSelectedPayroll(payroll)}
                    >
                      <Eye size={14} /> View Payslip
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 h-9"
                      title="Print or Save as PDF"
                      onClick={() => handlePrint(payroll)}
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">Print / PDF</span>
                    </Button>
                  </div>
                </div>
                
                {/* Expandable breakdown tags */}
                <div className="bg-muted/40 px-6 py-2.5 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-primary/70" /> 
                    <span>Overtime: {payroll.overtimeHours || 0} hrs (₹{(payroll.overtimePay || 0).toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={13} className="text-rose-500/70" /> 
                    <span>Late arrivals: {payroll.totalLateMinutes || 0} mins (₹{(payroll.lateDeduction || 0).toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-500/70" /> 
                    <span>Unpaid Leaves: {payroll.unpaidLeaves || 0} days (₹{(payroll.leaveDeduction || 0).toLocaleString()})</span>
                  </div>
                  {payroll.bonus > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingUp size={13} />
                      <span>Bonus: +₹{payroll.bonus.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* --- OFFICIAL PAYSLIP MODAL & PRINT VIEW --- */}
      {selectedPayroll && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedPayroll(null)}
        >
          <div 
            className="w-full max-w-3xl my-auto bg-card rounded-2xl shadow-2xl border border-border/80 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Action Bar (Hidden when printed) */}
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">
                  Salary Slip — {getMonthName(selectedPayroll.month)} {selectedPayroll.year}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2 h-9"
                  onClick={() => handlePrint()}
                >
                  <Printer size={15} /> Print / Save PDF
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => setSelectedPayroll(null)}
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Printable Payslip Document Container */}
            <div id="printable-payslip" className="p-6 sm:p-8 space-y-6 bg-background text-foreground">
              {/* Document Header */}
              <div className="border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3.5">
                  <SmartLogoBadge 
                    src={selectedPayroll.companyId?.logo || user?.companyLogo || "/logo.png"} 
                    alt={selectedPayroll.companyId?.name || user?.companyName || 'Company Logo'} 
                    className="h-14 w-14 p-1.5 rounded-xl border border-border shrink-0 bg-white dark:bg-slate-900" 
                  />
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-foreground">
                      {selectedPayroll.companyId?.name || user?.companyName || 'NexusHR Enterprise'}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedPayroll.companyId?.address || 'Official Confidential Payroll Document'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedPayroll.companyId?.email || user?.email || ''}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Salary Slip
                  </span>
                  <p className="text-base font-bold mt-1 text-foreground">
                    {getMonthName(selectedPayroll.month)} {selectedPayroll.year}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Ref ID: {selectedPayroll._id?.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Employee & Payment Summary Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/80 bg-muted/20 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Employee Name:</span>
                    <span className="font-bold text-foreground">
                      {selectedPayroll.employeeId?.name || user?.name || 'Employee'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Designation:</span>
                    <span className="font-semibold text-foreground">
                      {selectedPayroll.employeeId?.designation || user?.designation || 'Staff'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Department:</span>
                    <span className="font-semibold text-foreground">
                      {selectedPayroll.employeeId?.department || user?.department || 'Operations'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Email:</span>
                    <span className="text-foreground">
                      {selectedPayroll.employeeId?.email || user?.email || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 sm:border-l sm:border-border sm:pl-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Payment Status:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      selectedPayroll.status === 'Paid'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}>
                      {selectedPayroll.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Payment Date:</span>
                    <span className="text-foreground">
                      {selectedPayroll.paymentDate 
                        ? new Date(selectedPayroll.paymentDate).toLocaleDateString() 
                        : 'Pending Cycle Date'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Payment Method:</span>
                    <span className="text-foreground capitalize">
                      {selectedPayroll.paymentMethod ? selectedPayroll.paymentMethod.replace('_', ' ') : 'Bank Transfer'}
                    </span>
                  </div>
                  {selectedPayroll.accountNumberMasked && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Account:</span>
                      <span className="font-mono text-foreground">{selectedPayroll.accountNumberMasked}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="border border-border/80 rounded-xl overflow-hidden">
                  <div className="bg-emerald-500/10 px-4 py-2.5 border-b border-border/80 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp size={14} /> Earnings
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Amount (INR)</span>
                  </div>
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-semibold text-foreground">₹{selectedPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-muted-foreground">Overtime Pay</span>
                        {selectedPayroll.overtimeHours > 0 && (
                          <span className="text-[10px] text-muted-foreground block">
                            ({selectedPayroll.overtimeHours} hrs worked)
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">
                        {selectedPayroll.overtimePay > 0 ? `+ ₹${selectedPayroll.overtimePay.toLocaleString()}` : '₹0'}
                      </span>
                    </div>
                    {selectedPayroll.bonus > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Bonus & Allowances</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          + ₹{selectedPayroll.bonus.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-border flex justify-between items-center font-bold text-sm">
                      <span className="text-foreground">Total Gross Earnings</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ₹{(selectedPayroll.baseSalary + (selectedPayroll.overtimePay || 0) + (selectedPayroll.bonus || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-border/80 rounded-xl overflow-hidden">
                  <div className="bg-rose-500/10 px-4 py-2.5 border-b border-border/80 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <TrendingDown size={14} /> Deductions
                    </span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Amount (INR)</span>
                  </div>
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-muted-foreground">Late Arrivals Deduction</span>
                        {selectedPayroll.totalLateMinutes > 0 && (
                          <span className="text-[10px] text-muted-foreground block">
                            ({selectedPayroll.totalLateMinutes} mins cumulative)
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">
                        {selectedPayroll.lateDeduction > 0 ? `- ₹${selectedPayroll.lateDeduction.toLocaleString()}` : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-muted-foreground">Unpaid Leaves</span>
                        {selectedPayroll.unpaidLeaves > 0 && (
                          <span className="text-[10px] text-muted-foreground block">
                            ({selectedPayroll.unpaidLeaves} days approved)
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">
                        {selectedPayroll.leaveDeduction > 0 ? `- ₹${selectedPayroll.leaveDeduction.toLocaleString()}` : '₹0'}
                      </span>
                    </div>
                    {selectedPayroll.otherDeductions > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Other / Taxes</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          - ₹{selectedPayroll.otherDeductions.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-border flex justify-between items-center font-bold text-sm">
                      <span className="text-foreground">Total Deductions</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        ₹{((selectedPayroll.lateDeduction || 0) + (selectedPayroll.leaveDeduction || 0) + (selectedPayroll.otherDeductions || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold opacity-80">Net Payable Salary</p>
                  <div className="text-3xl sm:text-4xl font-black mt-1 flex items-center">
                    <IndianRupee size={28} className="mr-0.5" />
                    {selectedPayroll.netSalary.toLocaleString()}
                  </div>
                  <p className="text-[11px] opacity-80 mt-1">
                    Direct transfer to employee verified account
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/20 backdrop-blur-md">
                    {selectedPayroll.status}
                  </span>
                  {selectedPayroll.paymentDate && (
                    <p className="text-xs opacity-90 mt-1">
                      Processed on {new Date(selectedPayroll.paymentDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Note / Remarks if any */}
              {selectedPayroll.note && (
                <div className="p-3 rounded-lg border border-border/80 bg-muted/10 text-xs">
                  <span className="font-semibold text-foreground">HR Note: </span>
                  <span className="text-muted-foreground">{selectedPayroll.note}</span>
                </div>
              )}

              {/* Document Disclaimer / Footer */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <p>This is a system-generated document and requires no physical signature.</p>
                <p>Generated by NexusHR Enterprise Payroll Engine</p>
              </div>
            </div>

            {/* Modal Bottom Actions (Hidden when printed) */}
            <div className="no-print p-4 border-t border-border bg-muted/20 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPayroll(null)}
              >
                Close
              </Button>
              <Button 
                variant="default" 
                className="gap-2"
                onClick={() => handlePrint()}
              >
                <Printer size={15} /> Print / Save as PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Print CSS for pristine print/PDF output */}
      <style jsx global>{`
        @media print {
          /* Hide everything in page body */
          body * {
            visibility: hidden;
          }
          /* Show only printable payslip and its children */
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 30px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
