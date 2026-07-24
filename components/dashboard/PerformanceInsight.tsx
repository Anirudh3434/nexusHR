'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ChevronRight, Brain, RefreshCw, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

interface Report {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    designation: string;
  };
  rating: number;
  summary: string;
  merits: string[];
  demerits: string[];
}

export default function PerformanceInsight({ companyId }: { companyId: string }) {
  const [data, setData] = useState<{ date: string; reports: Report[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/analysis/dashboard?companyId=${companyId}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load performance insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  const handleManualTrigger = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/analysis/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        const result = await res.json();
        addToast({ 
          type: 'success', 
          title: 'Analysis Complete', 
          description: result.message || 'Team performance has been recalibrated by AI.' 
        });
        await fetchData();
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Sync Failed', description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden min-h-[300px] animate-pulse">
      <CardContent className="flex items-center justify-center h-full pt-20">
        <Brain className="animate-bounce" size={48} />
      </CardContent>
    </Card>
  );

  if (!data || data.reports.length === 0) return (
    <Card className="border-none shadow-xl bg-white dark:bg-gray-800 overflow-hidden">
      <CardContent className="p-12 text-center text-gray-400">
        <Brain className="mx-auto mb-4 opacity-20" size={64} />
        <p className="font-medium">No AI performance data available yet.</p>
        <p className="text-sm">The first analysis will run at midnight.</p>
      </CardContent>
    </Card>
  );

  const topPerformer = data.reports[0];
  const avgRating = data.reports.reduce((acc, curr) => acc + curr.rating, 0) / data.reports.length;

  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-gray-900 overflow-hidden group">
      <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Brain size={120} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                NVIDIA NIM • AI Assistant
              </span>
            </div>
            <CardTitle className="text-2xl font-black flex items-center gap-3 italic">
              <Sparkles className="animate-pulse" /> Daily Performance Insight
            </CardTitle>
            <CardDescription className="text-indigo-100 font-medium">
              AI analysis generated on {new Date(data.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold backdrop-blur-md"
            onClick={handleManualTrigger}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw size={16} className="animate-spin mr-2" />
            ) : (
              <Wand2 size={16} className="mr-2" />
            )}
            {isSyncing ? 'Analyzing...' : 'Sync AI'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
          {/* Top Section */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Team Summary</h3>
              <div className="flex items-center gap-1 text-green-500 font-bold text-sm">
                <TrendingUp size={16} /> 
                {avgRating.toFixed(1)}/10 Avg
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-sm text-indigo-900 dark:text-indigo-300 font-medium leading-relaxed italic">
                "{topPerformer.summary}"
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-400">Featured Top Performer</h4>
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    {topPerformer.employeeId.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{topPerformer.employeeId.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{topPerformer.employeeId.designation}</div>
                  </div>
                </div>
                <div className="text-xl font-black text-indigo-600">{topPerformer.rating.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="p-6 flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-4">Rankings</h3>
            <div className="space-y-3 flex-grow">
              {data.reports.slice(0, 4).map((report, idx) => (
                <div key={report._id} className="flex items-center justify-between group/item cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-200 dark:text-gray-700 group-hover/item:text-indigo-500 transition-colors">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{report.employeeId.name}</span>
                  </div>
                  <div className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                    report.rating >= 8 ? 'bg-green-50 text-green-600' :
                    report.rating >= 6 ? 'bg-yellow-50 text-yellow-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {report.rating}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-xl group/btn">
              See Full Performance Report <ChevronRight size={14} className="ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
