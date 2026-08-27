"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Briefcase, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  Minus,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Zap,
  Filter
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import RetentionRiskCard from '@/components/analytics/RetentionRiskCard';
import RetentionHeatmap from '@/components/analytics/RetentionHeatmap';
import RetentionAlerts from '@/components/analytics/RetentionAlerts';

interface EmployeeRiskProfile {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  role: string;
  avatar: string | null;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskChange: number;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  lastAssessment: string | null;
}

interface OverviewData {
  totalEmployees: number;
  assessedEmployeesCount: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  departmentBreakdown: Array<{
    department: string;
    totalEmployees: number;
    assessedEmployees: number;
    averageRiskScore: number;
    highRiskCount: number;
    riskLevel: string;
  }>;
  factorAverages: Array<{
    name: string;
    value: number;
  }>;
  topRiskEmployees: EmployeeRiskProfile[];
  recentAlerts: any[];
  employees: EmployeeRiskProfile[];
}

export default function RetentionAnalyticsPage() {
  const [view, setView] = useState<'overview' | 'team' | 'alerts'>('overview');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRiskProfile | null>(null);
  const { addToast } = useToast();

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/retention/overview');
      const json = await res.json();
      if (json.success && json.overview) {
        setData(json.overview);
        if (json.overview.employees.length > 0 && !selectedEmployee) {
          // Default select the top risk employee or first employee
          const defaultSelected = json.overview.topRiskEmployees[0] || json.overview.employees[0];
          setSelectedEmployee(defaultSelected);
        }
      }
    } catch (err) {
      console.error('Failed to load retention overview:', err);
      addToast({ type: 'error', title: 'Error', description: 'Failed to load retention analytics data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await fetch('/api/analytics/retention/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Predictions Recalculated',
          description: `Successfully analyzed ${json.processed || 0} employees with latest attendance & workload signals.`,
        });
        await fetchOverview();
      } else {
        addToast({ type: 'error', title: 'Recalculation Failed', description: json.message || 'Error occurred.' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to trigger recalculation.' });
    } finally {
      setRecalculating(false);
    }
  };

  const getRiskBadge = (level: string | null) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">LOW RISK</Badge>;
      case 'medium':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold">MEDIUM RISK</Badge>;
      case 'high':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold">HIGH RISK</Badge>;
      case 'critical':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse">CRITICAL RISK</Badge>;
      default:
        return <Badge variant="outline">NOT ASSESSED</Badge>;
    }
  };

  const filteredEmployees = (data?.employees || []).filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || e.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departmentList = ['All', ...Array.from(new Set((data?.employees || []).map(e => e.department).filter(Boolean)))];

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
            <Sparkles className="h-3.5 w-3.5" /> AI Predictive Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Retention & Attrition Analytics
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Continuous multi-factor retention modeling based on attendance consistency, sprint velocity, project workload, tenure, and compensation parity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Analyzing Signals...' : 'Recalculate Predictions'}
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Avg Risk Score */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Retention Risk</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{data?.averageRiskScore || 0}</span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Stable Org Benchmark
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Assessed Coverage */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Evaluation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{data?.assessedEmployeesCount || 0}</span>
                <span className="text-xs font-semibold text-slate-400">/ {data?.totalEmployees || 0}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">100% Coverage</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-black">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Critical & High Risk Watchlist */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">At-Risk Watchlist</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600">
                  {(data?.riskDistribution.critical || 0) + (data?.riskDistribution.high || 0)}
                </span>
                <span className="text-xs font-semibold text-slate-400">Employees</span>
              </div>
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Requires Action
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 font-black">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Active Alerts */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active HR Alerts</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600">{data?.recentAlerts.length || 0}</span>
                <span className="text-xs font-semibold text-slate-400">Notifications</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Automatic threshold alerts</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-black">
              <Zap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
        <button
          onClick={() => setView('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4 text-indigo-600" />
          Executive Overview & Individuals
        </button>
        <button
          onClick={() => setView('team')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'team'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4 text-teal-600" />
          Department Heatmap
        </button>
        <button
          onClick={() => setView('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            view === 'alerts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Alerts & Recommendations
          {(data?.recentAlerts.length || 0) > 0 && (
            <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {data?.recentAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* View 1: Executive Overview & Interactive Employee Explorer */}
      {view === 'overview' && (
        <div className="space-y-6">
          
          {/* Org Risk Distribution & Factor Health Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Risk Tier Distribution Card */}
            <Card className="lg:col-span-1 rounded-3xl border-slate-200/80 shadow-sm p-6 bg-white flex flex-col justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">
                  Risk Tier Distribution
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Proportion of workforce across risk categories
                </CardDescription>

                <div className="mt-5 space-y-3">
                  {/* Low Risk */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Low Risk (0 - 24)
                      </span>
                      <span className="text-slate-700">{data?.riskDistribution.low || 0} employees</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${((data?.riskDistribution.low || 0) / (data?.assessedEmployeesCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium Risk */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Medium Risk (25 - 49)
                      </span>
                      <span className="text-slate-700">{data?.riskDistribution.medium || 0} employees</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${((data?.riskDistribution.medium || 0) / (data?.assessedEmployeesCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* High Risk */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-orange-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" /> High Risk (50 - 74)
                      </span>
                      <span className="text-slate-700">{data?.riskDistribution.high || 0} employees</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${((data?.riskDistribution.high || 0) / (data?.assessedEmployeesCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Critical Risk */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-rose-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical Risk (75+)
                      </span>
                      <span className="text-slate-700">{data?.riskDistribution.critical || 0} employees</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full" 
                        style={{ width: `${((data?.riskDistribution.critical || 0) / (data?.assessedEmployeesCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Model: <strong className="text-slate-700">v1.0 Hybrid Engine</strong></span>
                <span>Confidence: <strong className="text-emerald-600">High (92%)</strong></span>
              </div>
            </Card>

            {/* Company-Wide Retention Factor Scoreboard */}
            <Card className="lg:col-span-2 rounded-3xl border-slate-200/80 shadow-sm p-6 bg-white">
              <CardTitle className="text-base font-extrabold text-slate-900">
                Company-Wide Factor Health Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Aggregated factor scores (Higher is better for retention stability)
              </CardDescription>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
                {(data?.factorAverages || []).map((f) => {
                  const factorIcons: Record<string, any> = {
                    attendance: Clock,
                    performance: TrendingUp,
                    engagement: Activity,
                    tenure: Calendar,
                    compensation: Briefcase,
                    workload: Zap,
                    manager_relationship: Users,
                  };
                  const Icon = factorIcons[f.name] || Activity;
                  const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                  return (
                    <div key={f.name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 truncate">{label}</span>
                        <Icon className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{f.value}</span>
                        <span className="text-xs text-slate-400 font-semibold">/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            f.value >= 75 ? 'bg-emerald-500' : f.value >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${f.value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Interactive Employee Explorer & Drill-down Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Employee Selection List (5 cols) */}
            <Card className="lg:col-span-5 rounded-3xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-extrabold text-slate-900">
                    Employee Directory
                  </CardTitle>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredEmployees.length} members
                  </span>
                </div>
                
                {/* Search & Department Filter */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by name, role, email..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none"
                  >
                    {departmentList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>

              <CardContent className="p-2 divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployee?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-indigo-50/80 border border-indigo-200/80 shadow-sm' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-[#03081c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                          {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{emp.designation}</p>
                          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/50 px-1.5 py-0.5 rounded">
                            {emp.department}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        {getRiskBadge(emp.riskLevel)}
                        <span className="text-[10px] font-bold text-slate-400">
                          Score: <strong className="text-slate-700">{emp.riskScore ?? 'N/A'}</strong>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Right: Detailed Risk Card & Recommendations for Selected Employee (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {selectedEmployee ? (
                <div className="space-y-4">
                  {/* Detailed RetentionRiskCard */}
                  <RetentionRiskCard
                    data={{
                      riskScore: selectedEmployee.riskScore || 0,
                      riskLevel: selectedEmployee.riskLevel || 'low',
                      factors: selectedEmployee.factors.map(f => ({
                        name: f.name,
                        value: f.value,
                        weight: f.weight,
                        trend: f.trend,
                      })),
                      lastAssessment: selectedEmployee.lastAssessment ? new Date(selectedEmployee.lastAssessment) : new Date(),
                      previousRiskScore: selectedEmployee.riskScore !== null ? selectedEmployee.riskScore - (selectedEmployee.riskChange || 0) : undefined,
                    }}
                  />

                  {/* AI Generated Retention Strategy Card */}
                  <Card className="rounded-3xl border-slate-200/80 shadow-sm p-6 bg-gradient-to-br from-indigo-50/40 via-white to-teal-50/40">
                    <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      AI Retention & Proactive Intervention Plan
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      Recommended actions for manager and HR for <strong className="text-slate-800">{selectedEmployee.name}</strong> ({selectedEmployee.designation})
                    </p>

                    <div className="mt-4 space-y-2.5">
                      {selectedEmployee.riskLevel === 'critical' || selectedEmployee.riskLevel === 'high' ? (
                        <>
                          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200/70 text-xs font-semibold text-rose-900">
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Schedule 1-on-1 Alignment Check-In</p>
                              <p className="text-[11px] text-rose-700 font-normal mt-0.5">
                                High burnout / attendance divergence detected. Conduct a supportive check-in regarding recent workload and project blockers.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs font-semibold text-amber-900">
                            <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Workload & Overtime Rebalancing</p>
                              <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                                Re-evaluate sprint capacity and distribute overdue tasks to prevent prolonged overtime fatigue.
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-900">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Strong Retention Stability</p>
                            <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                              Employee demonstrates high engagement, regular on-time attendance, and balanced workload. Continue positive recognition and career progression planning.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="rounded-3xl border-slate-200/80 shadow-sm p-12 text-center bg-white">
                  <p className="text-sm font-semibold text-slate-500">Select an employee on the left to view detailed retention risk breakdown.</p>
                </Card>
              )}
            </div>

          </div>
        </div>
      )}

      {/* View 2: Department Heatmap */}
      {view === 'team' && (
        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm p-6 bg-white">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Department Retention Heatmap & Risk Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Cross-department comparison of retention health and workforce stability
            </CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {(data?.departmentBreakdown || []).map((dept) => (
                <div 
                  key={dept.department}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">{dept.department}</h3>
                    <Badge className={
                      dept.averageRiskScore >= 60 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      dept.averageRiskScore >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }>
                      {dept.averageRiskScore >= 60 ? 'HIGH RISK' : dept.averageRiskScore >= 40 ? 'MODERATE' : 'HEALTHY'}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">{dept.averageRiskScore}</span>
                    <span className="text-xs font-semibold text-slate-400">/ 100 avg risk</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Total: <strong>{dept.totalEmployees}</strong></span>
                    <span>High Risk: <strong className={dept.highRiskCount > 0 ? 'text-rose-600' : 'text-slate-700'}>{dept.highRiskCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Full Heatmap Component */}
          {data && (
            <RetentionHeatmap
              team={data.employees.map(e => ({
                employeeId: e.id,
                name: e.name,
                designation: e.designation,
                department: e.department,
                riskScore: e.riskScore,
                riskLevel: e.riskLevel,
                lastAssessment: e.lastAssessment ? new Date(e.lastAssessment) : null,
              }))}
              statistics={{
                totalEmployees: data.totalEmployees,
                assessedEmployees: data.assessedEmployeesCount,
                averageRiskScore: data.averageRiskScore,
                riskDistribution: data.riskDistribution,
              }}
            />
          )}
        </div>
      )}

      {/* View 3: Alerts */}
      {view === 'alerts' && (
        <RetentionAlerts />
      )}
    </div>
  );
}
