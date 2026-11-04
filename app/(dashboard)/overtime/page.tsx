"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  RefreshCw,
  MoreVertical,
  X,
  History,
  CheckCircle2,
  Ban,
  RotateCcw,
  Palmtree
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';

export default function OvertimePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    note: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (user?.companyId) {
      fetchRecords();
      fetchEmployees();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/overtime?companyId=${user?.companyId}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to load overtime records' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees?companyId=${user?.companyId}`);
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.date || !formData.hours) {
      addToast({ type: 'error', title: 'Missing Info', description: 'Please fill all required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId: user?.companyId
        })
      });

      if (res.ok) {
        addToast({ type: 'success', title: 'Success', description: 'Overtime recorded successfully' });
        setShowModal(false);
        setFormData({ employeeId: '', date: new Date().toISOString().split('T')[0], hours: '', note: '' });
        fetchRecords();
      } else {
        const data = await res.json();
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/attendance/overtime', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      
      if (res.ok) {
        const msg = status === 'rejected' 
          ? 'excluded from payroll' 
          : status === 'comp_off' 
            ? 'converted to leave balance' 
            : 'restored to pending';
            
        addToast({ type: 'success', title: 'Updated', description: `Record ${msg}.` });
        fetchRecords();
      } else {
        const data = await res.json();
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', description: error.message });
    }
  };

  const filteredRecords = records.filter(r => 
    r.employeeId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employeeId?.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOvertime = records.reduce((acc, curr) => acc + (curr.overtimeHours || 0) + (curr.manualOvertimeHours || 0), 0);
  const manualCount = records.filter(r => r.manualOvertimeHours > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<Clock />}
        title="Overtime Management"
        description="Review and record extra working hours for your team."
        actions={
          <Button
            onClick={() => setShowModal(true)}
            className="gap-2"
          >
            <Plus size={18} /> Record Manual OT
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-primary/20 shadow-xs bg-primary/5 dark:bg-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-xl text-primary">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Total Hours</p>
                <div className="text-2xl font-black text-foreground">{totalOvertime.toFixed(1)}h</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border shadow-xs bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl text-foreground">
                <History size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Manual Entries</p>
                <div className="text-2xl font-black text-foreground">{manualCount} Records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/20 shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/15 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Period Total</p>
                <div className="text-2xl font-black text-foreground">{months[selectedMonth]} {selectedYear}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="rounded-[14px] border border-border shadow-xs">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-border rounded-xl px-3 py-1.5 bg-background shadow-xs transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary w-64">
                <Search size={16} className="text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search employee or dept..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-sm focus:ring-0 ml-2 w-full text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center border border-border rounded-xl px-3 py-1.5 bg-background shadow-xs transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
                <Calendar size={16} className="text-primary mr-1" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer ml-1 text-foreground font-medium outline-none"
                >
                  {months.map((m, i) => <option key={m} value={i} className="bg-card text-foreground">{m}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer ml-1 text-foreground font-medium outline-none border-l border-border pl-2"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => <option key={y} value={y} className="bg-card text-foreground">{y}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">System OT</th>
                  <th className="px-6 py-4 text-center">Manual OT</th>
                  <th className="px-6 py-4 text-center">Total OT</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <RefreshCw className="animate-spin text-primary mx-auto" />
                      <p className="text-muted-foreground mt-2 text-sm font-medium">Crunching the hours...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <EmptyState
                        title="No overtime records found"
                        description="No overtime records for this period"
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-muted/15 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-xs">
                            {record.employeeId?.name ? record.employeeId.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{record.employeeId?.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{record.employeeId?.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground font-medium">
                          {new Date(record.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-muted-foreground text-sm font-mono">{record.overtimeHours || 0}h</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-primary font-semibold text-xs bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-mono">
                          +{record.manualOvertimeHours || 0}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-bold text-foreground font-mono">
                          {((record.overtimeHours || 0) + (record.manualOvertimeHours || 0)).toFixed(1)}h
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          record.overtimeStatus === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400' 
                            : record.overtimeStatus === 'comp_off'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : record.overtimeStatus === 'rejected'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400'
                        }`}>
                          {record.overtimeStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted-foreground italic max-w-xs truncate">
                          {record.manualOvertimeNote || 'System Generated'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.overtimeStatus === 'rejected' || record.overtimeStatus === 'comp_off' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              onClick={() => handleStatusUpdate(record._id, 'pending')}
                              title="Restore to Pending"
                            >
                              <RotateCcw size={14} />
                            </Button>
                          ) : record.overtimeStatus === 'pending' || !record.overtimeStatus ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                                onClick={() => handleStatusUpdate(record._id, 'comp_off')}
                                title="Convert to Comp-Off Leave"
                              >
                                <Palmtree size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleStatusUpdate(record._id, 'rejected')}
                                title="Exclude from Payroll"
                              >
                                <Ban size={14} />
                              </Button>
                            </div>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                             <MoreVertical size={14} />
                          </Button>
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

      {/* Manual Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-xl font-bold">Record Manual Overtime</CardTitle>
                <CardDescription>Adjust working hours for a specific date</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full">
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Select Employee</label>
                  <select 
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                    required
                  >
                    <option value="">Choose Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Date</label>
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Extra Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="e.g. 2.5"
                      value={formData.hours}
                      onChange={(e) => setFormData({...formData, hours: e.target.value})}
                      className="w-full p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Reason / Note</label>
                  <textarea 
                    rows={3}
                    placeholder="Project deadline, Late shift support, etc."
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    className="w-full p-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Record Overtime'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
