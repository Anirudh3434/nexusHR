"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  User, 
  ChevronRight, 
  ArrowUpRight,
  Filter,
  RefreshCw,
  MoreVertical,
  X,
  History,
  CheckCircle2,
  AlertCircle,
  Ban,
  RotateCcw,
  Palmtree
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Clock className="text-blue-600" size={32} />
            Overtime Management
          </h1>
          <p className="text-gray-500 mt-1">Review and record extra working hours for your team.</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-2 h-11 px-6 rounded-xl"
        >
          <Plus size={18} /> Record Manual OT
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Total Hours</p>
                <div className="text-2xl font-black text-blue-900 dark:text-blue-300">{totalOvertime.toFixed(1)}h</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-purple-50 dark:bg-purple-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
                <History size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Manual Entries</p>
                <div className="text-2xl font-black text-purple-900 dark:text-purple-300">{manualCount} Records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-green-50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Period Total</p>
                <div className="text-2xl font-black text-green-900 dark:text-green-300">{months[selectedMonth]} {selectedYear}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-xl shadow-gray-200/50">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-xl px-3 py-1.5 bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 w-64">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search employee or dept..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-sm focus:ring-0 ml-2 w-full"
                />
              </div>
              <div className="flex items-center border rounded-xl px-3 py-1.5 bg-white shadow-sm">
                <Calendar size={16} className="text-gray-400" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer ml-1"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <RefreshCw className="animate-spin text-blue-600 mx-auto" />
                      <p className="text-gray-500 mt-2 text-sm font-medium">Crunching the hours...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-400 font-medium">
                      No overtime records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                            {record.employeeId?.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{record.employeeId?.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{record.employeeId?.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 font-medium">
                          {new Date(record.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-500 text-sm">{record.overtimeHours || 0}h</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-0.5 rounded-lg">
                          +{record.manualOvertimeHours || 0}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-black text-gray-900">
                          {((record.overtimeHours || 0) + (record.manualOvertimeHours || 0)).toFixed(1)}h
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          record.overtimeStatus === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : record.overtimeStatus === 'comp_off'
                              ? 'bg-blue-100 text-blue-700'
                              : record.overtimeStatus === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.overtimeStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500 italic max-w-xs truncate">
                          {record.manualOvertimeNote || 'System Generated'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.overtimeStatus === 'rejected' || record.overtimeStatus === 'comp_off' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
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
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleStatusUpdate(record._id, 'comp_off')}
                                title="Convert to Comp-Off Leave"
                              >
                                <Palmtree size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleStatusUpdate(record._id, 'rejected')}
                                title="Exclude from Payroll"
                              >
                                <Ban size={14} />
                              </Button>
                            </div>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
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
          <Card className="w-full max-w-lg shadow-2xl border-none">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl font-black">Record Manual Overtime</CardTitle>
                <CardDescription>Adjust working hours for a specific date</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full">
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Select Employee</label>
                  <select 
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    <label className="text-xs font-bold uppercase text-gray-400">Date</label>
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">Extra Hours</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="e.g. 2.5"
                      value={formData.hours}
                      onChange={(e) => setFormData({...formData, hours: e.target.value})}
                      className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Reason / Note</label>
                  <textarea 
                    rows={3}
                    placeholder="Project deadline, Late shift support, etc."
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
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
