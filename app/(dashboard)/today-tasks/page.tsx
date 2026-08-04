'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  employeeComment?: string;
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
    isManager: boolean;
  }>;
  managerApproval?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  managerRemarks?: string;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  editWindowExpiresAt?: string;
  editRequestedBy?: string;
  editRequestedAt?: string;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [pickedItems, setPickedItems] = useState<TodayTaskItem[]>([]);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [editWindowExpiresAt, setEditWindowExpiresAt] = useState<string | null>(null);
  const [managerApproval, setManagerApproval] = useState<'pending' | 'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [managerRemarks, setManagerRemarks] = useState<string>('');

  // EOD Lock & Shift timing state
  const [unlockTimeStr, setUnlockTimeStr] = useState<string>('5:30 PM');
  const [isEodUnlocked, setIsEodUnlocked] = useState<boolean>(false);
  const [testOverride, setTestOverride] = useState<boolean>(false);

  // Employee comment for less than 8 hours
  const [employeeComment, setEmployeeComment] = useState<string>('');
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [totalHours, setTotalHours] = useState<number>(0);

  // Comment system
  const [newComment, setNewComment] = useState<string>('');

  // Manager add task modal
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [selectedReportForTask, setSelectedReportForTask] = useState<TodayReport | null>(null);
  const [employeeAssignedTasks, setEmployeeAssignedTasks] = useState<AssignedTask[]>([]);

  // EOD status visibility - show after initial submission or when editing
  const canEditEodStatus = reportStatus === 'submitted';
  const isEditWindowOpen = editWindowExpiresAt 
    ? new Date() < new Date(editWindowExpiresAt)
    : false;
  
  // Employee edit mode: draft or manager requested changes (disabled when report is approved)
  const isEmployeeEditMode = (reportStatus === 'draft' || managerApproval === 'changes_requested' || isEditWindowOpen) && managerApproval !== 'approved';

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
          setReportId(data.userReport._id || null);
          setEditWindowExpiresAt(data.userReport.editWindowExpiresAt || null);
          setManagerApproval(data.userReport.managerApproval || null);
          setManagerRemarks(data.userReport.managerRemarks || '');
        } else {
          setPickedItems([]);
          setReportStatus('draft');
          setSubmittedAt(null);
          setReportId(null);
          setEditWindowExpiresAt(null);
          setManagerApproval(null);
          setManagerRemarks('');
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

  // Remove item from picked list (persisted to the report)
  const handleRemoveItem = async (taskId: string) => {
    // Optimistically remove locally for instant feedback
    setPickedItems(prev => prev.filter(i => i.taskId !== taskId));

    const currentReportId = reportId || companyReports.find(r => r.userId === user?.id)?._id;
    if (!currentReportId) return;

    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReportId,
          taskId,
          action: 'remove_task'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPickedItems(data.report.items);
      } else {
        alert(data.message || 'Failed to remove task');
        fetchData();
      }
    } catch (err) {
      console.error('Error removing task:', err);
      alert('Network error removing task');
      fetchData();
    }
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

  // Update EOD status separately after submission
  const handleUpdateEodStatus = async (taskId: string, eodStatus: string, eodRemarks: string) => {
    if (reportStatus !== 'submitted') {
      alert('Please submit your task plan first before updating EOD status');
      return;
    }

    try {
      const currentReportId = reportId || companyReports.find(r => r.userId === user?.id)?._id;
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReportId,
          taskId,
          eodStatus,
          eodRemarks,
          action: 'update_eod_status'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPickedItems(data.report.items);
        alert('EOD status updated successfully');
      } else {
        alert('Failed to update EOD status');
      }
    } catch (err) {
      console.error('Error updating EOD status:', err);
      alert('Network error updating EOD status');
    }
  };

  // Manager approval/rejection
  const handleManagerApproval = async (reportId: string, approval: string, remarks: string) => {
    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          approval,
          remarks,
          action: 'manager_approval'
        })
      });

      if (res.ok) {
        alert(`Report ${approval} successfully`);
        fetchData();
      } else {
        alert('Failed to update approval status');
      }
    } catch (err) {
      console.error('Error updating approval:', err);
      alert('Network error updating approval');
    }
  };

  // Submit report
  const handleSubmitReport = async (action: 'save_draft' | 'submit') => {
    if (pickedItems.length === 0) {
      alert('Please pick at least one task for today!');
      return;
    }

    // Calculate total hours for validation
    const timeToMinutes: { [key: string]: number } = {
      '15 mins': 15,
      '30 mins': 30,
      '45 mins': 45,
      '1 hr': 60,
      '2 hrs': 120,
      '3 hrs': 180,
      '4 hrs': 240,
      '6 hrs': 360,
      '8 hrs': 480
    };

    const totalMinutes = pickedItems.reduce((sum, item) => {
      return sum + (timeToMinutes[item.estimateTime] || 0);
    }, 0);
    const calculatedTotalHours = totalMinutes / 60;

    // If submitting and less than 8 hours, show comment modal
    if (action === 'submit' && calculatedTotalHours < 8 && !employeeComment) {
      setTotalHours(calculatedTotalHours);
      setShowCommentModal(true);
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
          action,
          employeeComment: action === 'submit' ? employeeComment : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReportStatus(data.report.status);
        setSubmittedAt(data.report.submittedAt || null);
        setReportId(data.report._id || null);
        setEmployeeComment('');
        setShowCommentModal(false);
        alert(data.message);
        fetchData();
      } else {
        if (data.requiresComment) {
          setTotalHours(data.totalHours);
          setShowCommentModal(true);
        } else {
          alert(data.message || 'Failed to submit report');
        }
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Network error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  // Add comment
  const handleAddComment = async (reportId: string, content: string) => {
    if (!content.trim()) return;

    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          content,
          action: 'add_comment'
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchData();
      } else {
        alert('Failed to add comment');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Network error adding comment');
    }
  };

  // Request edit window
  const handleRequestEdit = async (reportId: string) => {
    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          action: 'request_edit'
        })
      });

      if (res.ok) {
        alert('Edit window extended for 1 hour');
        fetchData();
      } else {
        alert('Failed to request edit');
      }
    } catch (err) {
      console.error('Error requesting edit:', err);
      alert('Network error requesting edit');
    }
  };

  // Manager add task to employee's plan
  const handleAddTaskToEmployee = async (task: AssignedTask) => {
    if (!selectedReportForTask) return;

    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForTask._id,
          task: {
            taskId: task._id,
            taskNumber: task.taskNumber,
            title: task.title,
            currentStatus: task.status,
            estimateTime: '1 hr'
          },
          action: 'add_task_to_employee'
        })
      });

      if (res.ok) {
        alert('Task added successfully');
        setShowAddTaskModal(false);
        setSelectedReportForTask(null);
        setEmployeeAssignedTasks([]);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to add task');
      }
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Network error adding task');
    }
  };

  // Fetch employee's assigned tasks when opening modal
  const handleOpenAddTaskModal = async (report: TodayReport) => {
    setSelectedReportForTask(report);
    setShowAddTaskModal(true);

    try {
      const res = await fetch(`/api/tasks?userId=${report.userId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeAssignedTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching employee tasks:', err);
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
    <div className="space-y-6 mx-auto pb-12 font-sans">
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
          {/* Left Column: Pick Assigned Tickets - Show in edit mode */}
          {isEmployeeEditMode && (
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
          )}

          {/* Right Column: Tabular Plan & EOD Status Submission */}
          <div className={`${isEmployeeEditMode ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    Today's Task Plan
                    {reportStatus === 'submitted' && (
                      <>
                        {managerApproval === 'changes_requested' ? (
                          <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold uppercase">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Changes Requested
                          </span>
                        ) : managerApproval === 'approved' ? (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Submitted to Management
                          </span>
                        )}
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Define estimate time per ticket. EOD status will be auto-set at shift end.</p>
                </div>

                {isEmployeeEditMode ? (
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
                      {managerApproval === 'changes_requested' ? 'Re-submit to Manager' : 'Submit to Manager'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSubmitReport('save_draft')}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-100 flex items-center gap-1"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Save EOD Status
                    </Button>
                    {managerApproval !== 'approved' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reportId && handleRequestEdit(reportId)}
                        className="text-xs rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50 flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Request Edit Permission
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {(managerRemarks || managerApproval === 'changes_requested') && (
                <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-amber-900 text-xs">Manager Remarks / Feedback</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold uppercase">
                        {managerApproval === 'changes_requested' ? 'Changes Requested' : 'Manager Comment'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-semibold">
                      {managerRemarks ? `"${managerRemarks}"` : 'Manager requested changes to your task plan. You can edit tickets and estimates on the left and re-submit.'}
                    </p>
                  </div>
                </div>
              )}

              {reportStatus === 'submitted' && (
                <>
                  {/* Employee Comment Section */}
                  {companyReports.find(r => r._id === reportId)?.employeeComment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-800">Your Comment:</span>
                      </div>
                      <p className="text-xs text-blue-700">{companyReports.find(r => r._id === reportId)?.employeeComment}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700">Comments</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {companyReports.find(r => r._id === reportId)?.comments.map((comment) => (
                        <div key={comment.id} className={`p-2 rounded-lg text-xs ${comment.isManager ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{comment.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                            {comment.isManager && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Manager</span>}
                          </div>
                          <p className="text-slate-600">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      />
                      <Button
                        size="sm"
                        onClick={() => reportId && handleAddComment(reportId, newComment)}
                        disabled={!newComment.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        Send
                      </Button>
                    </div>
                  </div>

                  {/* Edit Window Request */}
                  {!isEditWindowOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reportId && handleRequestEdit(reportId)}
                      className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      Request Edit Window
                    </Button>
                  )}
                </>
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
                        <th className="px-4 py-3">EOD Status</th>
                        <th className="px-4 py-3">Remarks</th>
                        {isEmployeeEditMode && <th className="px-4 py-3 text-right">Action</th>}
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
                              disabled={!isEmployeeEditMode}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none ${
                                !isEmployeeEditMode 
                                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                                  : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-400/20 text-slate-800'
                              }`}
                            >
                              {ESTIMATE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.eodStatus}
                              onChange={(e) => handleUpdateItem(item.taskId, 'eodStatus', e.target.value as any)}
                              className={`px-2 py-1 border rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                item.eodStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                item.eodStatus === 'blocked' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                item.eodStatus === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                'bg-slate-50 text-slate-700 border-slate-300'
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
                              placeholder="Add EOD notes..."
                              className="px-2.5 py-1 w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-xs focus:outline-none text-slate-700"
                            />
                          </td>
                          {isEmployeeEditMode && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveItem(item.taskId)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                title="Remove ticket"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
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
                        {report.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                      {report.managerApproval && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          report.managerApproval === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                          report.managerApproval === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                          report.managerApproval === 'changes_requested' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {report.managerApproval === 'approved' ? 'Approved' :
                           report.managerApproval === 'rejected' ? 'Rejected' :
                           report.managerApproval === 'changes_requested' ? 'Changes Requested' : 'Pending'}
                        </span>
                      )}
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

                  {/* Employee Comment */}
                  {report.employeeComment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-800">Employee Comment:</span>
                      </div>
                      <p className="text-[10px] text-blue-700">{report.employeeComment}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  {report.comments && report.comments.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-700">Comments</h4>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {report.comments.map((comment) => (
                          <div key={comment.id} className={`p-1.5 rounded-lg text-[10px] ${comment.isManager ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-slate-200'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-bold text-slate-800">{comment.userName}</span>
                              <span className="text-[9px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                              {comment.isManager && <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold">Manager</span>}
                            </div>
                            <p className="text-slate-600">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manager Actions */}
                  {isAdminView && report.status === 'submitted' && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60">
                      {report.managerApproval === 'approved' || report.managerApproval === 'rejected' ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <div className="flex items-center gap-2">
                            {report.managerApproval === 'approved' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">Report Approved by Manager</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">Report Rejected by Manager</span>
                              </>
                            )}
                            {report.managerRemarks && (
                              <span className="text-xs text-slate-500 font-medium ml-2">
                                — "{report.managerRemarks}"
                              </span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const remarks = prompt('Enter reason to request changes / re-open plan:');
                              if (remarks !== null) handleManagerApproval(report._id || '', 'changes_requested', remarks);
                            }}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline shrink-0 transition-colors"
                          >
                            Re-open / Request Changes
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-slate-700">Manager Actions:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleManagerApproval(report._id || '', 'approved', '')}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const remarks = prompt('Enter rejection reason:');
                                if (remarks) handleManagerApproval(report._id || '', 'rejected', remarks);
                              }}
                              className="border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-lg"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const remarks = prompt('Enter requested changes:');
                                if (remarks) handleManagerApproval(report._id || '', 'changes_requested', remarks);
                              }}
                              className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs rounded-lg"
                            >
                              Request Changes
                            </Button>
                            {(report.editWindowExpiresAt && new Date() < new Date(report.editWindowExpiresAt)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAddTaskModal(report)}
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs rounded-lg"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Task
                              </Button>
                            )}
                          </div>
                          {report.managerRemarks && (
                            <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                              <span className="font-bold">Manager Remarks:</span> {report.managerRemarks}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment Modal for < 8 hours */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Work Time Less Than 8 Hours</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Your total estimated work time is <span className="font-bold text-amber-600">{totalHours.toFixed(1)} hours</span>. 
              Please add a comment explaining this to your manager before submitting.
            </p>
            <textarea
              value={employeeComment}
              onChange={(e) => setEmployeeComment(e.target.value)}
              placeholder="Explain why your work time is less than 8 hours..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20 resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentModal(false);
                  setEmployeeComment('');
                }}
                className="flex-1 text-sm"
              >
                Back to Add Tasks
              </Button>
              <Button
                onClick={() => handleSubmitReport('submit')}
                disabled={!employeeComment.trim() || submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit with Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Add Task Modal */}
      {showAddTaskModal && selectedReportForTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Plus className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Add Task to Employee's Plan</h3>
                  <p className="text-xs text-slate-500">{selectedReportForTask.userName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setSelectedReportForTask(null);
                  setEmployeeAssignedTasks([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {employeeAssignedTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">No assigned tasks available for this employee.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {employeeAssignedTasks.map((task) => {
                  const isAlreadyAdded = selectedReportForTask.items.some(i => i.taskId === task._id);
                  return (
                    <div 
                      key={task._id} 
                      className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                        isAlreadyAdded 
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
                        onClick={() => handleAddTaskToEmployee(task)}
                        disabled={isAlreadyAdded}
                        className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                          isAlreadyAdded 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                        }`}
                        title={isAlreadyAdded ? 'Already added' : 'Add to plan'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddTaskModal(false);
                  setSelectedReportForTask(null);
                  setEmployeeAssignedTasks([]);
                }}
                className="w-full text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
