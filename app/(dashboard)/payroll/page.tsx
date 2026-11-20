"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  IndianRupee, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Search,
  RefreshCw,
  Printer,
  Edit,
  Save,
  X,
  Settings as SettingsIcon,
  Eye,
  CircleDollarSign,
  Send,
  Building2,
  Check,
  Copy,
  Zap,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';

interface PayrollRecord {
  _id: string;
  employeeId?: {
    _id?: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
  };
  companyId?: string | { _id: string; name: string };
  month: number;
  year: number;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  totalLateMinutes: number;
  lateDeduction: number;
  unpaidLeaves: number;
  leaveDeduction: number;
  otherDeductions: number;
  netSalary: number;
  status: 'Generated' | 'Reviewed' | 'Processing' | 'Paid' | 'Failed';
  isManualEdit?: boolean;
  paymentDate?: string;
  paymentMethod?: string;
  payoutId?: string;
  payoutStatus?: string;
  payoutMode?: string;
  utr?: string;
  failureReason?: string;
  note?: string;
}

interface RazorpayXStatus {
  isConfigured: boolean;
  source: 'company' | 'env' | 'mock' | 'none';
  defaultMode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
  accountNumberMasked?: string;
  isMock?: boolean;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
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
  const [settingsTab, setSettingsTab] = useState<'schedule' | 'razorpayx'>('schedule');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // RazorpayX Configuration State
  const [razorpayxConfig, setRazorpayxConfig] = useState({
    enabled: false,
    keyId: '',
    keySecret: '',
    hasKeySecret: false,
    accountNumber: '',
    webhookSecret: '',
    hasWebhookSecret: false,
    clearWebhookSecret: false,
    defaultMode: 'IMPS' as 'IMPS' | 'NEFT' | 'RTGS' | 'UPI',
  });
  const [razorpayxStatus, setRazorpayxStatus] = useState<RazorpayXStatus | null>(null);
  const [isTestingRzp, setIsTestingRzp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // RazorpayX Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedForPayout, setSelectedForPayout] = useState<PayrollRecord[]>([]);
  const [payoutMode, setPayoutMode] = useState<'IMPS' | 'NEFT' | 'RTGS' | 'UPI'>('IMPS');
  const [payoutNarration, setPayoutNarration] = useState('');
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // View State
  const [viewingPayroll, setViewingPayroll] = useState<PayrollRecord | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/company/payroll-settings?companyId=${user?.companyId}`);
      const data = await res.json();
      if (res.ok) {
        setPayrollCycleDate(data.payrollCycleDate || 28);
        setOvertimeRate(data.overtimeRate || 1.5);
        if (data.razorpayxConfig) {
          setRazorpayxConfig({
            enabled: Boolean(data.razorpayxConfig.enabled),
            keyId: data.razorpayxConfig.keyId || '',
            keySecret: '',
            hasKeySecret: Boolean(data.razorpayxConfig.hasKeySecret),
            accountNumber: data.razorpayxConfig.accountNumber || '',
            webhookSecret: '',
            hasWebhookSecret: Boolean(data.razorpayxConfig.hasWebhookSecret),
            clearWebhookSecret: false,
            defaultMode: data.razorpayxConfig.defaultMode || 'IMPS',
          });
        }
        if (data.razorpayxStatus) {
          setRazorpayxStatus(data.razorpayxStatus);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, [user?.companyId]);

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?companyId=${user?.companyId}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to load payroll records' });
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, selectedMonth, selectedYear, addToast]);

  useEffect(() => {
    if (user?.companyId) {
      fetchPayrolls();
      fetchSettings();
    }
  }, [user?.companyId, fetchPayrolls, fetchSettings]);

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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Generation failed';
      addToast({ type: 'error', title: 'Generation Failed', description: msg });
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
        setPayrolls(prev => prev.map(p => p._id === id ? { ...p, status: status as PayrollRecord['status'] } : p));
      }
    } catch {
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to refresh payroll';
      addToast({ type: 'error', title: 'Error', description: msg });
    }
  };

  const openEditModal = (payroll: PayrollRecord) => {
    setEditingPayroll(payroll);
    setEditFormData({
      bonus: payroll.bonus || 0,
      otherDeductions: payroll.otherDeductions || 0,
      note: payroll.note || '',
      netSalary: payroll.netSalary
    });
  };

  const handleEditChange = (field: string, value: string | number) => {
    const newData = { ...editFormData, [field]: value };
    
    if (editingPayroll && (field === 'bonus' || field === 'otherDeductions')) {
      const bonus = field === 'bonus' ? Number(value) : Number(editFormData.bonus);
      const otherDeductions = field === 'otherDeductions' ? Number(value) : Number(editFormData.otherDeductions);
      const basePay = editingPayroll.baseSalary + editingPayroll.overtimePay - editingPayroll.lateDeduction - editingPayroll.leaveDeduction;
      newData.netSalary = basePay + bonus - otherDeductions;
    }
    
    setEditFormData(newData);
  };

  const handleEditSave = async () => {
    if (!editingPayroll) return;
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
    } catch {
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
          overtimeRate,
          razorpayxConfig: {
            enabled: razorpayxConfig.enabled,
            keyId: razorpayxConfig.keyId,
            keySecret: razorpayxConfig.keySecret || undefined,
            accountNumber: razorpayxConfig.accountNumber,
            webhookSecret: razorpayxConfig.webhookSecret || undefined,
            clearWebhookSecret: razorpayxConfig.clearWebhookSecret,
            defaultMode: razorpayxConfig.defaultMode,
          }
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        addToast({ type: 'success', title: 'Updated', description: 'Payroll settings and RazorpayX config saved.' });
        if (data.razorpayxStatus) setRazorpayxStatus(data.razorpayxStatus);
        await fetchSettings();
        setTestResult(null);
        setShowSettings(false);
      } else {
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update schedule';
      addToast({ type: 'error', title: 'Error', description: msg });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTestRazorpayX = async () => {
    try {
      setIsTestingRzp(true);
      setTestResult(null);
      const res = await fetch('/api/company/payroll-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: user?.companyId,
          testConnection: true,
          razorpayxConfig: {
            keyId: razorpayxConfig.keyId,
            keySecret: razorpayxConfig.keySecret,
            accountNumber: razorpayxConfig.accountNumber
          }
        })
      });
      const data = await res.json();
      setTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Successfully verified RazorpayX credentials.' : 'Connection test failed.')
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTestingRzp(false);
    }
  };

  // Open Payout Modal for single record or bulk
  const openPayoutModal = (records?: PayrollRecord[]) => {
    const targets = records && records.length > 0
      ? records
      : filteredPayrolls.filter(p => p.status !== 'Paid');
    
    if (targets.length === 0) {
      addToast({ type: 'warning', title: 'All Paid', description: 'All records for this month are already marked as Paid.' });
      return;
    }
    
    setSelectedForPayout(targets);
    setPayoutMode(razorpayxConfig.defaultMode || 'IMPS');
    setPayoutNarration(`Salary ${months[selectedMonth]} ${selectedYear}`);
    setShowPayoutModal(true);
  };

  const handleExecutePayout = async () => {
    try {
      setIsDisbursing(true);
      const res = await fetch('/api/payroll/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollIds: selectedForPayout.map(p => p._id),
          mode: payoutMode,
          narration: payoutNarration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'RAZORPAYX_NOT_CONFIGURED') {
          addToast({
            type: 'error',
            title: 'RazorpayX Not Configured',
            description: 'Please configure your RazorpayX credentials in Payroll Settings first.'
          });
          setShowPayoutModal(false);
          setSettingsTab('razorpayx');
          setShowSettings(true);
          return;
        }
        throw new Error(data.message || 'Disbursement failed');
      }

      addToast({
        type: data.failedCount === 0 ? 'success' : 'warning',
        title: 'Payout Processed',
        description: data.message,
      });

      setShowPayoutModal(false);
      fetchPayrolls();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Disbursement failed';
      addToast({ type: 'error', title: 'Payout Error', description: msg });
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleCheckPayoutStatus = async (payrollId: string) => {
    try {
      setCheckingStatusId(payrollId);
      const res = await fetch(`/api/payroll/payout?payrollId=${payrollId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      addToast({
        type: 'info',
        title: 'Status Updated',
        description: `Current status: ${data.payoutStatus || data.status}${data.utr ? ` (UTR: ${data.utr})` : ''}`,
      });
      fetchPayrolls();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status check failed';
      addToast({ type: 'error', title: 'Status Check Failed', description: msg });
    } finally {
      setCheckingStatusId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
    addToast({ type: 'success', title: 'Copied', description: 'UTR copied to clipboard.' });
  };

  const filteredPayrolls = payrolls.filter(p => 
    (p.employeeId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.employeeId?.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpense = filteredPayrolls.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);
  const pendingPayrolls = filteredPayrolls.filter(p => p.status !== 'Paid');
  const totalPendingAmount = pendingPayrolls.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <PageHeader
        icon={<CircleDollarSign />}
        title="Payroll & RazorpayX Payouts"
        description="Review attendance, auto-calculate net pay, and disburse salaries via RazorpayX business banking."
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSettingsTab('schedule');
                setShowSettings(true);
              }}
              className="gap-1.5 text-xs bg-white dark:bg-gray-800"
            >
              <SettingsIcon size={14} /> Settings & RazorpayX
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
              variant="outline"
              className="gap-1.5 text-xs"
            >
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp size={14} />}
              Generate
            </Button>
            <Button
              onClick={() => openPayoutModal()}
              disabled={pendingPayrolls.length === 0}
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Send size={13} />
              Disburse via RazorpayX ({pendingPayrolls.length})
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="col-span-2 md:col-span-1 bg-primary text-primary-foreground border-none shadow-md shadow-primary/20">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 min-w-0">
                <p className="text-primary-foreground/80 text-[11px] sm:text-xs font-medium uppercase tracking-wider">Total Net Salary</p>
                <div className="text-xl sm:text-2xl font-bold flex items-center truncate">
                  <IndianRupee size={18} className="mr-0.5 shrink-0" />
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
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Pending Disbursal</p>
              <AlertCircle size={16} className="text-orange-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1">
              {pendingPayrolls.length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 dark:text-slate-400 truncate">
              ₹{totalPendingAmount.toLocaleString()} to disburse
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Processed / Paid</p>
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold mt-1">
              {filteredPayrolls.filter(p => p.status === 'Paid').length}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 dark:text-slate-400 truncate">Successfully credited</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-300">RazorpayX Gateway</p>
              </div>
              <span className={`h-2 w-2 rounded-full ${razorpayxStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {razorpayxStatus?.isConfigured ? 'Active & Ready' : 'Setup Required'}
              </span>
              {razorpayxStatus?.isMock && (
                <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-mono font-medium">Mock Mode</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {razorpayxStatus?.accountNumberMasked ? `Acc: ••••${razorpayxStatus.accountNumberMasked.slice(-4)}` : 'Click settings to configure'}
            </p>
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

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search employee or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
              {pendingPayrolls.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => openPayoutModal()}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Send size={12} />
                  <span>Pay All ({pendingPayrolls.length})</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mb-2 text-primary" />
              <p className="text-xs">Loading payroll records...</p>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<CircleDollarSign className="w-10 h-10 text-muted-foreground" />}
                title="No Payroll Records"
                description={`No payroll generated for ${months[selectedMonth]} ${selectedYear}. Click "Generate" to calculate salaries.`}
                action={
                  <Button
                    size="sm"
                    onClick={generatePayroll}
                    disabled={isGenerating}
                    className="gap-1.5"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Payroll'}
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-border">
                {filteredPayrolls.map((payroll) => (
                  <div key={payroll._id} className="p-3.5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {payroll.employeeId?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{payroll.employeeId?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{payroll.employeeId?.department} • {payroll.employeeId?.designation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">₹{payroll.netSalary.toLocaleString()}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          payroll.status === 'Paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : payroll.status === 'Processing'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                              : payroll.status === 'Failed'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {payroll.status}
                        </span>
                      </div>
                    </div>

                    {/* RazorpayX UTR if paid */}
                    {payroll.utr && (
                      <div className="flex items-center justify-between text-[10px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md px-2 py-1">
                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">UTR: {payroll.utr}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payroll.utr || '', payroll._id)}
                          className="text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                        >
                          {copiedUtr === payroll._id ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedUtr === payroll._id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {payroll.failureReason && (
                      <div className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded p-1.5">
                        {payroll.failureReason}
                      </div>
                    )}

                    {/* Mobile Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs text-muted-foreground gap-1"
                          onClick={() => setViewingPayroll(payroll)}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-orange-500"
                          onClick={() => handleRefresh(payroll._id)}
                          title="Recalculate"
                        >
                          <RefreshCw size={12} />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {payroll.status === 'Processing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckPayoutStatus(payroll._id)}
                            disabled={checkingStatusId === payroll._id}
                            className="h-7 px-2 text-[10px] gap-1 text-blue-600"
                          >
                            <RefreshCw size={11} className={checkingStatusId === payroll._id ? 'animate-spin' : ''} />
                            Status
                          </Button>
                        )}

                        {payroll.status !== 'Paid' && (
                          <Button
                            size="sm"
                            onClick={() => openPayoutModal([payroll])}
                            className="h-7 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Send size={11} />
                            Pay RazorpayX
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[850px]">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/20 border-b dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Employee</th>
                      <th className="px-5 py-3.5 font-semibold">Base Salary</th>
                      <th className="px-5 py-3.5 font-semibold">Additions</th>
                      <th className="px-5 py-3.5 font-semibold">Deductions</th>
                      <th className="px-5 py-3.5 font-semibold">Net Pay</th>
                      <th className="px-5 py-3.5 font-semibold">Disbursal & Status</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPayrolls.map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {payroll.employeeId?.name?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{payroll.employeeId?.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-slate-400">{payroll.employeeId?.department} • {payroll.employeeId?.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium">₹{payroll.baseSalary.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="text-green-600 dark:text-green-400">
                              OT: {payroll.overtimePay > 0 ? `₹${payroll.overtimePay.toLocaleString()}` : payroll.overtimeHours > 0 ? `${payroll.overtimeHours}h OT` : '₹0'}
                            </span>
                            {payroll.bonus > 0 && (
                              <span className="text-[10px] text-green-500">+ ₹{payroll.bonus.toLocaleString()} bonus</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5 text-xs text-red-600 dark:text-red-400">
                            <span>Late: ₹{payroll.lateDeduction.toLocaleString()}</span>
                            <span>Leave: ₹{payroll.leaveDeduction.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-primary text-base">
                            ₹{payroll.netSalary.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                payroll.status === 'Paid' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : payroll.status === 'Processing'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
                                    : payroll.status === 'Failed'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : payroll.status === 'Reviewed'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {payroll.status === 'Reviewed' ? 'Verified' : payroll.status}
                              </span>

                              {payroll.paymentMethod === 'razorpayx' && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  RazorpayX
                                </span>
                              )}
                            </div>

                            {/* UTR Pill */}
                            {payroll.utr && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(payroll.utr || '', payroll._id)}
                                title="Click to copy UTR"
                                className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors"
                              >
                                <span>UTR: {payroll.utr.slice(0, 10)}...</span>
                                {copiedUtr === payroll._id ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                              </button>
                            )}

                            {payroll.failureReason && (
                              <span className="text-[10px] text-red-500 max-w-[160px] truncate" title={payroll.failureReason}>
                                {payroll.failureReason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-500"
                              onClick={() => setViewingPayroll(payroll)}
                              title="View Breakdown"
                            >
                              <Eye size={15} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600"
                              onClick={() => openEditModal(payroll)}
                              title="Edit Record"
                            >
                              <Edit size={15} />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-orange-500 hover:text-orange-600"
                              onClick={() => handleRefresh(payroll._id)}
                              title="Recalculate with Attendance/OT"
                            >
                              <RefreshCw size={13} />
                            </Button>

                            {payroll.status === 'Processing' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckPayoutStatus(payroll._id)}
                                disabled={checkingStatusId === payroll._id}
                                className="h-8 px-2 text-[10px] gap-1 text-blue-600 border-blue-200"
                              >
                                <RefreshCw size={12} className={checkingStatusId === payroll._id ? 'animate-spin' : ''} />
                                <span>Check</span>
                              </Button>
                            )}

                            {payroll.status !== 'Paid' && payroll.status !== 'Processing' && (
                              <Button 
                                size="sm" 
                                onClick={() => openPayoutModal([payroll])} 
                                className="h-8 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              >
                                <Send size={11} />
                                <span>Pay RazorpayX</span>
                              </Button>
                            )}

                            {payroll.status !== 'Paid' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => updateStatus(payroll._id, 'Paid')} 
                                className="h-8 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                title="Mark as Paid manually (cash/cheque)"
                              >
                                Manual Paid
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

      {/* RazorpayX Payout Confirmation Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-emerald-500/20 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-emerald-500/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Send size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">Disburse via RazorpayX</CardTitle>
                  <CardDescription>Instant automated salary disbursement</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPayoutModal(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Summary Banner */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Employees</span>
                  <span className="font-bold text-sm text-foreground">{selectedForPayout.length} Selected</span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Payout Amount</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center">
                    <IndianRupee size={20} />
                    {selectedForPayout.reduce((acc, curr) => acc + (curr.netSalary || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Transfer Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['IMPS', 'NEFT', 'RTGS', 'UPI'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayoutMode(m)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                        payoutMode === m 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs'
                          : 'border-border text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {m}
                      <span className="block text-[9px] font-normal opacity-75">
                        {m === 'IMPS' ? 'Instant' : m === 'UPI' ? 'VPA' : 'Batch'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Narration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Bank Narration / Remarks</label>
                <input
                  type="text"
                  maxLength={30}
                  value={payoutNarration}
                  onChange={(e) => setPayoutNarration(e.target.value)}
                  placeholder="e.g. Salary Oct 2026"
                  className="w-full p-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-muted-foreground">Will appear on the employee bank statement (max 30 chars).</p>
              </div>

              {/* Employee Preview List */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Recipients Preview</p>
                <div className="max-h-40 overflow-y-auto divide-y border rounded-lg bg-background text-xs">
                  {selectedForPayout.map((item) => (
                    <div key={item._id} className="p-2.5 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{item.employeeId?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.employeeId?.email || item.employeeId?.department}</p>
                      </div>
                      <span className="font-bold text-emerald-600">₹{item.netSalary.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Funds will be debited from your linked RazorpayX account and directly deposited into the verified bank accounts of employees.
                </span>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayoutModal(false)} disabled={isDisbursing}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={handleExecutePayout}
                  disabled={isDisbursing}
                >
                  {isDisbursing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send size={15} />}
                  <span>{isDisbursing ? 'Processing Payout...' : 'Confirm & Disburse'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Modal (Landscape Split Layout with RazorpayX & Nexi on Left) */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="relative w-full max-w-4xl lg:max-w-5xl rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Fintech Showcase Panel */}
            <div className="w-full md:w-[360px] lg:w-[410px] shrink-0 bg-gradient-to-br from-[#06101e] via-[#091b34] to-[#040a16] text-white p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
              {/* Background ambient lighting */}
              <div className="absolute -top-20 -left-20 w-52 h-52 bg-sky-500/15 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute top-1/2 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-16 left-1/3 w-52 h-52 bg-primary/20 rounded-full blur-[70px] pointer-events-none" />

              {/* Brand Bar */}
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Razorpay Bolt Badge */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284c7] via-[#0284c7] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" stroke="none" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 leading-none">
                        <span className="text-lg font-black tracking-tight text-white font-sans">Razorpay</span>
                        <span className="text-xl font-black text-sky-400 -ml-0.5">X</span>
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Direct Bank Rails</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    razorpayxConfig.enabled
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${razorpayxConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {razorpayxConfig.enabled ? 'Connected' : 'Setup Mode'}
                  </span>
                </div>

                {/* Fintech & Nexi Graphic Banner */}
                <div className="mt-4 relative rounded-xl overflow-hidden border border-white/10 shadow-xl group bg-slate-950/70">
                  <img 
                    src="/images/razorpayx_nexi_payroll.jpg" 
                    alt="RazorpayX and Nexi Mascot" 
                    className="w-full h-36 sm:h-44 object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-white/95">
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                      <span className="font-semibold">Direct Disbursals</span>
                    </span>
                    <span className="font-mono text-[10px] text-sky-300 bg-sky-950/80 border border-sky-500/30 px-2 py-0.5 rounded-full">
                      IMPS • NEFT • UPI
                    </span>
                  </div>
                </div>

                {/* Nexi Avatar Feature Card */}
                <div className="mt-3 p-3 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-sm flex items-center gap-3">
                  <div className="relative shrink-0 w-11 h-11 rounded-full bg-gradient-to-tr from-primary/30 to-sky-500/30 border border-primary/40 flex items-center justify-center overflow-hidden shadow-inner">
                    <img 
                      src="/images/mascot/nexi_security_avatar.png" 
                      alt="Nexi Security Avatar" 
                      className="w-full h-full object-cover object-top scale-110"
                    />
                  </div>
                  <div className="text-xs leading-snug">
                    <p className="font-bold text-white/95 flex items-center gap-1.5">
                      <span>Nexi Payroll Engine</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary-foreground/90 border border-primary/30">AI Verified</span>
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Auto-computes overtime, applies deductions, and triggers batch bank transfers with live UTR verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Configuration Form Panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <SettingsIcon size={17} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">Payroll Configuration</h2>
                    <p className="text-xs text-muted-foreground">Manage salary cycles, overtime rules, and RazorpayX banking credentials.</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSettings(false)}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b text-xs font-semibold px-4 sm:px-6 shrink-0 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setSettingsTab('razorpayx')}
                  className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
                    settingsTab === 'razorpayx'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-bold bg-sky-500/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 size={14} />
                  <span>RazorpayX Banking</span>
                  {razorpayxConfig.enabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('schedule')}
                  className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
                    settingsTab === 'schedule'
                      ? 'border-primary text-primary font-bold bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar size={14} />
                  <span>Schedule & OT</span>
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {settingsTab === 'schedule' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Monthly Generation Date
                      </label>
                      <select 
                        value={payrollCycleDate}
                        onChange={(e) => setPayrollCycleDate(Number(e.target.value))}
                        className="w-full p-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm font-medium"
                      >
                        {[...Array(31)].map((_, i) => (
                          <option key={i+1} value={i+1}>
                            {i+1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} of every month
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Payroll drafts will be automatically generated for all active employees on this date each month.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Overtime Multiplier (x)
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        max="5"
                        value={overtimeRate}
                        onChange={(e) => setOvertimeRate(Number(e.target.value))}
                        className="w-full p-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none text-sm font-medium"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Base hourly rate is multiplied by this factor when calculating overtime pay (standard: 1.5x).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1 text-muted-foreground">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span>Automated Payroll Processing Rules</span>
                      </p>
                      <p>
                        Late arrivals, approved leaves, and overtime hours from the Attendance ledger are factored in automatically during draft creation.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* RazorpayX Banking Tab */
                  <div className="space-y-4">
                    {/* Enable Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
                      <div>
                        <p className="text-sm font-bold text-foreground">Enable RazorpayX Payouts</p>
                        <p className="text-xs text-muted-foreground">Automate direct bank account transfers for staff salary disbursals.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={razorpayxConfig.enabled} 
                          onChange={(e) => setRazorpayxConfig({ ...razorpayxConfig, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        RazorpayX Key ID
                      </label>
                      <input
                        type="text"
                        placeholder="rzp_live_... or rzp_test_..."
                        value={razorpayxConfig.keyId}
                        onChange={(e) => setRazorpayxConfig({ ...razorpayxConfig, keyId: e.target.value })}
                        className="w-full p-2.5 text-sm border rounded-xl bg-background font-mono focus:ring-2 focus:ring-sky-500/30 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>RazorpayX Key Secret</span>
                        {razorpayxConfig.hasKeySecret && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] normal-case">
                            ✓ Saved securely in encrypted vault
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        placeholder={razorpayxConfig.hasKeySecret ? '•••••••••••••••• (leave blank to keep unchanged)' : 'Enter your RazorpayX Key Secret'}
                        value={razorpayxConfig.keySecret}
                        onChange={(e) => setRazorpayxConfig({ ...razorpayxConfig, keySecret: e.target.value })}
                        className="w-full p-2.5 text-sm border rounded-xl bg-background font-mono focus:ring-2 focus:ring-sky-500/30 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Source Account Number (Debit Account)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 7878780080316316"
                        value={razorpayxConfig.accountNumber}
                        onChange={(e) => setRazorpayxConfig({ ...razorpayxConfig, accountNumber: e.target.value })}
                        className="w-full p-2.5 text-sm border rounded-xl bg-background font-mono focus:ring-2 focus:ring-sky-500/30 outline-none"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Current Account number, or the Customer Identifier for RazorpayX Lite. This is the account funds are debited from.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Transfer Mode</label>
                        <select
                          value={razorpayxConfig.defaultMode}
                          onChange={(e) => {
                            const val = e.target.value as 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
                            setRazorpayxConfig({ ...razorpayxConfig, defaultMode: val });
                          }}
                          className="w-full p-2.5 text-sm border rounded-xl bg-background font-medium focus:ring-2 focus:ring-sky-500/30 outline-none"
                        >
                          <option value="IMPS">IMPS (Instant - 24/7)</option>
                          <option value="NEFT">NEFT (Standard Batch)</option>
                          <option value="RTGS">RTGS (&gt; ₹2 Lakhs)</option>
                          <option value="UPI">UPI (Virtual Address)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Webhook Secret</span>
                          {razorpayxConfig.hasWebhookSecret && !razorpayxConfig.clearWebhookSecret && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] normal-case">
                              ✓ Saved securely
                            </span>
                          )}
                        </label>
                        <input
                          type="password"
                          placeholder={
                            razorpayxConfig.hasWebhookSecret && !razorpayxConfig.clearWebhookSecret
                              ? '•••••••••••••••• (leave blank to keep unchanged)'
                              : 'Enter the RazorpayX webhook secret'
                          }
                          value={razorpayxConfig.webhookSecret}
                          onChange={(e) =>
                            setRazorpayxConfig({
                              ...razorpayxConfig,
                              webhookSecret: e.target.value,
                              clearWebhookSecret: false,
                            })
                          }
                          className="w-full p-2.5 text-sm border rounded-xl bg-background font-mono focus:ring-2 focus:ring-sky-500/30 outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Must match the secret configured on the RazorpayX webhook. Required to accept payout events.
                        </p>
                        {razorpayxConfig.hasWebhookSecret && (
                          <button
                            type="button"
                            onClick={() =>
                              setRazorpayxConfig({
                                ...razorpayxConfig,
                                webhookSecret: '',
                                clearWebhookSecret: !razorpayxConfig.clearWebhookSecret,
                              })
                            }
                            className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                          >
                            {razorpayxConfig.clearWebhookSecret
                              ? 'Keep the saved webhook secret'
                              : 'Remove the saved webhook secret'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test Connection Button */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestRazorpayX}
                        disabled={isTestingRzp}
                        className="w-full gap-2 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 text-xs py-2"
                      >
                        {isTestingRzp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap size={14} className="text-sky-500" />}
                        <span>Test RazorpayX Connection</span>
                      </Button>

                      {testResult && (
                        <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                          testResult.success 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                        }`}>
                          {testResult.success ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t bg-muted/20 shrink-0">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button 
                  className="gap-2" 
                  onClick={handleSettingsSave}
                  disabled={isUpdatingSettings}
                >
                  {isUpdatingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  <span>Save Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Breakdown Modal */}
      {viewingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl shadow-2xl border-primary/20 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl">Salary Breakdown & Payslip</CardTitle>
                <CardDescription>
                  {viewingPayroll.employeeId?.name} • {months[viewingPayroll.month]} {viewingPayroll.year}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingPayroll(null)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-green-600 dark:text-green-400 border-b pb-2 flex items-center gap-2">
                    <TrendingUp size={16} /> Earnings & Additions
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Base Salary</span>
                      <span className="font-semibold">₹{viewingPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-slate-400">Overtime Hours</span>
                        <span className="text-[10px] text-gray-400 italic">
                          {viewingPayroll.overtimeHours} hrs worked
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

              {/* RazorpayX Transaction Details if available */}
              {(viewingPayroll.utr || viewingPayroll.payoutId) && (
                <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <Building2 size={14} />
                    <span>RazorpayX Banking Receipt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground">Payout ID:</span>
                      <p className="font-mono font-medium text-foreground">{viewingPayroll.payoutId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bank UTR Number:</span>
                      <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{viewingPayroll.utr || 'Pending Confirmation'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="mt-6 p-6 bg-primary rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
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
                    className="w-full p-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Other Deductions (₹)</label>
                  <input 
                    type="number" 
                    value={editFormData.otherDeductions}
                    onChange={(e) => handleEditChange('otherDeductions', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-red-600 dark:text-red-400"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Notes / Remarks</label>
                <textarea 
                  value={editFormData.note}
                  onChange={(e) => handleEditChange('note', e.target.value)}
                  placeholder="Reason for manual adjustment..."
                  className="w-full p-2 border rounded-lg bg-background min-h-[80px] focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-sm"
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
    </div>
  );
}
