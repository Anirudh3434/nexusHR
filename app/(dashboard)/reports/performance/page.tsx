'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Search, Brain, Calendar, ArrowRight, User as UserIcon, 
  Sparkles, Filter, TrendingUp, ChevronRight, Loader2, Wand2, RefreshCw,
  Building, Briefcase, Star
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

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
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Minimal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-[0.2em]">
            <Sparkles size={14} /> Analytics Engine
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Performance Reports</h1>
          <p className="text-sm text-gray-400 font-medium">Daily AI-driven productivity analysis and insights.</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'hr') && (
          <Button 
            variant="outline"
            className="border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 h-10 px-6 font-bold text-xs uppercase tracking-widest transition-all"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Wand2 className="mr-2" size={14} />}
            {isSyncing ? 'Processing...' : 'Run Sync'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <Input 
            placeholder="Search by name or department..." 
            className="h-12 pl-12 bg-gray-50/50 border-gray-100 rounded-2xl focus:bg-white transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Minimalist Table */}
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-30">
              <Loader2 className="animate-spin" size={48} />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-gray-400 font-bold italic">No performance data found.</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
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
                    <tr key={report._id} className="group hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 font-black text-xs group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {report.employeeId.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 leading-tight">{report.employeeId.name}</div>
                            <div className="text-[9px] uppercase font-black tracking-widest text-gray-300">
                              {report.employeeId.designation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Building size={12} className="text-gray-300" />
                          {report.employeeId.department}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 line-clamp-1 italic font-medium max-w-xs">
                          "{report.summary}"
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                          report.rating >= 8 ? 'text-green-600 bg-green-50' :
                          report.rating >= 6 ? 'text-amber-600 bg-amber-50' :
                          'text-rose-600 bg-rose-50'
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
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full hover:bg-white hover:shadow-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
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
