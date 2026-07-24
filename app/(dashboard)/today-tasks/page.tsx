'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Plus, 
  Trash2, 
  Send, 
  Calendar, 
  Sparkles, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  ShieldCheck,
  ListOrdered,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AssignedTask {
  _id: string;
  taskNumber: string;
  title: string;
  status: string;
  priority: string;
  taskType: string;
}

interface TodayTaskItem {
  taskId: string;
  taskNumber: string;
  title: string;
  currentStatus: string;
  estimateTime: string;
  eodStatus: 'completed' | 'in_progress' | 'blocked' | 'pending';
  eodRemarks?: string;
}

interface TodayReport {
  _id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  items: TodayTaskItem[];
  status: 'draft' | 'submitted';
  submittedAt?: string;
}

const ESTIMATE_OPTIONS = [
  '15 mins',
  '30 mins',
  '45 mins',
  '1 hr',
  '2 hrs',
  '3 hrs',
  '4 hrs',
  '6 hrs',
  '8 hrs'
];

export default function TodayTasksPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [pickedItems, setPickedItems] = useState<TodayTaskItem[]>([]);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // EOD Lock & Shift timing state
  const [unlockTimeStr, setUnlockTimeStr] = useState<string>('5:30 PM');
  const [isEodUnlocked, setIsEodUnlocked] = useState<boolean>(false);
  const [testOverride, setTestOverride] = useState<boolean>(false);

  // EOD status visibility - only show after initial submission
  const canEditEodStatus = reportStatus === 'submitted';
  
  // Manager view
  const [userRole, setUserRole] = useState<string>('employee');
  const [companyReports, setCompanyReports] = useState<TodayReport[]>([]);
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'team_eod'>('my_tasks');

  const isAdminView = userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin';

  // Fetch today's data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/today-tasks?date=${date}`);
      const data = await res.json();
      
      if (res.ok) {
        setAssignedTasks(data.assignedTasks || []);
        setUnlockTimeStr(data.unlockTimeStr || '5:30 PM');
        setIsEodUnlocked(!!data.isEodUnlocked);

        const currentRole = data.userRole || 'employee';
        setUserRole(currentRole);

        if (currentRole === 'admin' || currentRole === 'hr' || currentRole === 'super_admin') {
          setActiveTab('team_eod');
        }

        if (data.userReport) {
          setPickedItems(data.userReport.items || []);
          setReportStatus(data.userReport.status || 'draft');
          setSubmittedAt(data.userReport.submittedAt || null);
        } else {
          setPickedItems([]);
          setReportStatus('draft');
          setSubmittedAt(null);
        }
        setCompanyReports(data.companyReports || []);
      }
    } catch (err) {
      console.error('Error fetching today tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle adding an assigned task to today's picked items
  const handlePickTask = (task: AssignedTask) => {
    if (pickedItems.some(i => i.taskId === task._id)) return;

    const newItem: TodayTaskItem = {
      taskId: task._id,
      taskNumber: task.taskNumber,
      title: task.title,
      currentStatus: task.status,
      estimateTime: '1 hr',
      eodStatus: 'in_progress',
      eodRemarks: ''
    };
    setPickedItems(prev => [...prev, newItem]);
  };

  // Remove item from picked list
  const handleRemoveItem = (taskId: string) => {
    setPickedItems(prev => prev.filter(i => i.taskId !== taskId));
  };

  // Update item field
  const handleUpdateItem = (taskId: string, field: keyof TodayTaskItem, value: any) => {
    setPickedItems(prev => prev.map(item => {
      if (item.taskId === taskId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Submit report
  const handleSubmitReport = async (action: 'save_draft' | 'submit') => {
    if (pickedItems.length === 0) {
      alert('Please pick at least one task for today!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/today-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          items: pickedItems,
          action
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReportStatus(data.report.status);
        setSubmittedAt(data.report.submittedAt || null);
        alert(data.message);
        fetchData();
      } else {
        alert(data.message || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Network error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Today Task & EOD Status</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {isAdminView 
                ? 'Review submitted employee daily task plans and EOD status updates across the company'
                : 'Plan your daily task completion estimates and submit EOD progress directly to management'
              }
            </p>
          </div>
        </div>

        {/* Date Selector & Tab Control */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-transparent border-none focus:outline-none text-xs font-semibold text-slate-800"
            />
          </div>

          {!isAdminView && companyReports.length > 0 && (
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('my_tasks')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'my_tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Today Task
              </button>
              <button
                onClick={() => setActiveTab('team_eod')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'team_eod' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Team EOD Reports ({companyReports.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'my_tasks' && !isAdminView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pick Assigned Tickets */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-500" />
                  <h2 className="font-bold text-sm text-slate-800">Assigned Tickets ({assignedTasks.length})</h2>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Pick for today</span>
              </div>

              {assignedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No open tickets assigned to you right now.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {assignedTasks.map((task) => {
                    const isPicked = pickedItems.some(i => i.taskId === task._id);
                    return (
                      <div 
                        key={task._id} 
                        className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                          isPicked 
                            ? 'bg-slate-50 border-slate-200 opacity-60' 
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{task.taskNumber}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">{task.taskType}</span>
                          </div>
                          <p className="font-bold text-slate-800 truncate text-[11px]">{task.title}</p>
                        </div>
                        
                        <button
                          onClick={() => handlePickTask(task)}
                          disabled={isPicked}
                          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                            isPicked 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                          }`}
                          title={isPicked ? 'Already added to today task' : 'Add to today plan'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabular Plan & EOD Status Submission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    Today's Task Plan & EOD Table
                    {reportStatus === 'submitted' && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Submitted to Management
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Define estimate time per ticket and update EOD completion status</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmitReport('save_draft')}
                    disabled={submitting || pickedItems.length === 0}
                    className="text-xs rounded-xl border-slate-200"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSubmitReport('submit')}
                    disabled={submitting || pickedItems.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-100"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    Submit to Manager
                  </Button>
                </div>
              </div>

              {!canEditEodStatus && (
                <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200/90 px-4 py-3 rounded-xl text-xs font-semibold text-amber-900 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>EOD Status option will be available after submitting your today's task plan</span>
                  </div>
                </div>
              )}

              {pickedItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                  <Sparkles className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">No tasks picked for today yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Select tickets from your assigned tasks list on the left to build today's plan and set estimates.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs font-medium">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Ticket ID</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Estimate Time</th>
                        {canEditEodStatus ? (
                          <>
                            <th className="px-4 py-3">EOD Status</th>
                            <th className="px-4 py-3">Remarks</th>
                          </>
                        ) : (
                          <th className="px-4 py-3">EOD Status</th>
                        )}
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pickedItems.map((item) => (
                        <tr key={item.taskId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-700">{item.taskNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate">{item.title}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {item.currentStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.estimateTime}
                              onChange={(e) => handleUpdateItem(item.taskId, 'estimateTime', e.target.value)}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400/20 text-slate-800"
                            >
                              {ESTIMATE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          {canEditEodStatus ? (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <select
                                  value={item.eodStatus}
                                  onChange={(e) => handleUpdateItem(item.taskId, 'eodStatus', e.target.value as any)}
                                  className={`px-2 py-1 border rounded-lg text-xs font-bold focus:outline-none ${
                                    item.eodStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    item.eodStatus === 'blocked' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    item.eodStatus === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="blocked">Blocked</option>
                                  <option value="pending">Pending</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.eodRemarks || ''}
                                  onChange={(e) => handleUpdateItem(item.taskId, 'eodRemarks', e.target.value)}
                                  placeholder="EOD notes/progress..."
                                  className="px-2.5 py-1 w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-xs focus:outline-none text-slate-700"
                                />
                              </td>
                            </>
                          ) : (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-400" />
                                Available after submission
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.taskId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Remove ticket"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      ) : (
        /* Team EOD Reports View (for Management / Admin) */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Team EOD Reports ({companyReports.length})</h2>
            <p className="text-xs text-slate-400 font-medium">Review submitted daily plans, completion estimates, and status updates across the company</p>
          </div>

          {companyReports.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No team reports submitted for this date yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {companyReports.map((report) => (
                <div key={report._id} className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/40">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {report.userName ? report.userName.slice(0, 2).toUpperCase() : 'EM'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{report.userName}</h4>
                        <p className="text-[10px] text-slate-400">{report.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        report.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {report.status === 'submitted' ? 'Submitted to Manager' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                        <tr>
                          <th className="px-3.5 py-2.5">Ticket ID</th>
                          <th className="px-3.5 py-2.5">Title</th>
                          <th className="px-3.5 py-2.5">Estimate</th>
                          <th className="px-3.5 py-2.5">EOD Status</th>
                          <th className="px-3.5 py-2.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {report.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700">{item.taskNumber}</td>
                            <td className="px-3.5 py-2.5 text-slate-800 font-semibold">{item.title}</td>
                            <td className="px-3.5 py-2.5 text-indigo-600 font-bold">{item.estimateTime}</td>
                            <td className="px-3.5 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.eodStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                item.eodStatus === 'blocked' ? 'bg-rose-100 text-rose-800' :
                                item.eodStatus === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {item.eodStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500 italic">{item.eodRemarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
