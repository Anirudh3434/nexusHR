'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Brain, Sparkles, TrendingUp, Target, 
  AlertCircle, CheckCircle2, Calendar, Clock, Loader2,
  ChevronDown, User as UserIcon, BarChart3, LineChart as LineChartIcon,
  Circle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, LineChart, Line
} from 'recharts';

interface PerformanceReport {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    designation: string;
    department: string;
    email: string;
  };
  date: string;
  rating: number;
  summary: string;
  merits: string[];
  demerits: string[];
  suggestions: string[];
  metrics: {
    totalHours: number;
    lateMinutes: number;
    overtimeHours: number;
  };
}

export default function DetailedPerformancePage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const reportRes = await fetch(`/api/analysis/report/${id}`);
        const reportData = await reportRes.json();
        setReport(reportData);

        if (reportData.employeeId?._id) {
          const histRes = await fetch(`/api/analysis/history?employeeId=${reportData.employeeId._id}&days=14`);
          const histData = await histRes.json();
          setHistory(histData);
        }
      } catch (error) {
        console.error('Failed to load deep-dive data');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Processing Insight...</p>
    </div>
  );

  if (!report) return (
    <EmptyState
      title="Report not found."
      icon={<AlertCircle size={18} />}
      action={
        <Button variant="ghost" onClick={() => router.back()}>Return</Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Sparkles />}
        title={report.employeeId.name}
        description={`${report.employeeId.designation} • ${report.employeeId.department}`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors dark:bg-slate-800/50 dark:hover:bg-slate-700"
            >
              <ArrowLeft size={18} className="text-gray-400" />
            </Button>
            <div className="text-right">
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Performance Rating</div>
              <div className="text-4xl font-black text-gray-900 tracking-tighter dark:text-slate-100">{report.rating.toFixed(1)}</div>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Detailed Charts & Feedback */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Trend Chart (Minimalist) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">14-Day Performance Window</h3>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs dark:text-indigo-400">
                <TrendingUp size={14} /> Historical Trend
              </div>
            </div>
            <div className="h-[260px] w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #f1f5f9', 
                      boxShadow: 'none',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Qualitative Section (Clean Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <CheckCircle2 size={12} className="text-indigo-400" /> Notable Merits
              </h4>
              <div className="space-y-3">
                {report.merits.map((m, i) => (
                  <div key={i} className="text-sm font-medium text-gray-600 leading-relaxed pl-4 border-l-2 border-gray-100 italic dark:text-slate-400 dark:border-slate-800">
                    {m}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <AlertCircle size={12} className="text-rose-400" /> Focus Areas
              </h4>
              <div className="space-y-3">
                {report.demerits.map((d, i) => (
                  <div key={i} className="text-sm font-medium text-gray-600 leading-relaxed pl-4 border-l-2 border-rose-100 italic dark:text-slate-400">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary & Specific Metrics */}
        <div className="lg:col-span-4 space-y-12">
          
          {/* Executive Summary Block */}
          <div className="space-y-4 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="absolute top-0 left-0 w-1 y-full h-full bg-indigo-600" />
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">AI Conclusion</span>
            </div>
            <p className="text-md font-medium text-gray-700 leading-relaxed italic dark:text-slate-300">
              "{report.summary}"
            </p>
          </div>

          {/* Metric Stack */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Core Performance Metrics</h4>
            
            <div className="flex items-center justify-between group p-2">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all dark:border-slate-800">
                  <Clock size={14} className="text-gray-400" />
                </div>
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400">Working Hours</div>
              </div>
              <div className="text-lg font-black text-gray-900 tracking-tighter dark:text-slate-100">{report.metrics.totalHours.toFixed(1)}h</div>
            </div>

            <div className="flex items-center justify-between group p-2">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all dark:border-slate-800">
                  <AlertCircle size={14} className="text-gray-400" />
                </div>
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400">Late Arrival</div>
              </div>
              <div className="text-lg font-black text-rose-500 tracking-tighter">{report.metrics.lateMinutes}m</div>
            </div>

            <div className="flex items-center justify-between group p-2">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all dark:border-slate-800">
                  <TrendingUp size={14} className="text-gray-400" />
                </div>
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400">Overtime Contribution</div>
              </div>
              <div className="text-lg font-black text-gray-900 tracking-tighter dark:text-slate-100">{report.metrics.overtimeHours}h</div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-slate-800">
             <Button 
               variant="outline" 
               className="w-full border-gray-100 text-gray-400 font-bold uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-all dark:border-slate-800 dark:hover:bg-slate-800"
             >
               Regenerate AI Analysis
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
