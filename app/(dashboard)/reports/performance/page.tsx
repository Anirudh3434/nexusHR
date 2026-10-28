'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { 
  Search, Brain, Calendar, ArrowRight, User as UserIcon, 
  Sparkles, Filter, TrendingUp, ChevronRight, Loader2, Wand2, RefreshCw,
  Building, Briefcase, Star
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/PageHeader';

interface PerformanceReport {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    designation: string;
    department: string;
  };
  date: string;
  rating: number;
  summary: string;
}

export default function PerformanceListPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analysis/dashboard?companyId=${user?.companyId}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/analysis/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'AI Synced', description: 'Performance reports updated.' });
        fetchReports();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Sync Failed', description: 'AI processing error.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.employeeId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeId.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Sparkles />}
        title="Performance Reports"
        description="Daily AI-driven productivity analysis and insights."
        actions={
          (user?.role === 'admin' || user?.role === 'hr') && (
            <Button
              variant="outline"
              className="border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 h-10 px-6 font-bold text-xs uppercase tracking-widest transition-all dark:border-slate-700 dark:text-slate-400"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Wand2 className="mr-2" size={14} />}
              {isSyncing ? 'Processing...' : 'Run Sync'}
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <Input 
            placeholder="Search by name or department..." 
            className="h-12 pl-12 bg-gray-50/50 border-gray-100 rounded-2xl focus:bg-white transition-all text-sm font-medium dark:bg-slate-800/70 dark:border-slate-800 dark:focus:bg-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Minimalist Table */}
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-30">
              <Loader2 className="animate-spin" size={48} />
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyState title="No performance data found." icon={<TrendingUp size={18} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 dark:bg-slate-800/70 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Department</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Summary</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Rating</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReports.map((report) => (
                    <tr key={report._id} className="group hover:bg-indigo-50/20 transition-colors dark:hover:bg-indigo-500/10">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 font-black text-xs group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors dark:bg-slate-800/50 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-300">
                            {report.employeeId.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 leading-tight dark:text-slate-100">{report.employeeId.name}</div>
                            <div className="text-[9px] uppercase font-black tracking-widest text-gray-300">
                              {report.employeeId.designation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400">
                          <Building size={12} className="text-gray-300" />
                          {report.employeeId.department}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 line-clamp-1 italic font-medium max-w-xs dark:text-slate-400">
                          "{report.summary}"
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                          report.rating >= 8 ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' :
                          report.rating >= 6 ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' :
                          'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'
                        }`}>
                          <Star size={10} fill="currentColor" />
                          {report.rating.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {new Date(report.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/reports/performance/${report._id}`}>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-white hover:shadow-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-all dark:hover:bg-slate-800 dark:text-indigo-400">
                            <ChevronRight size={18} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
