'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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
  Lock,
  Briefcase,
  Layers,
  PlusCircle,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

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
  description?: string;
  currentStatus: string;
  estimateTime: string;
  eodStatus: 'completed' | 'in_progress' | 'blocked' | 'pending';
  eodRemarks?: string;
  isCustom?: boolean;
  category?: string;
  addedAt?: string | Date;
}

const CUSTOM_CATEGORIES = [
  'Meeting',
  'Code Review',
  'Ops & Support',
  'Documentation',
  'Training',
  'Administrative',
  'Other'
];

const PRESET_WORK = [
  { label: 'Client Meeting / Call', category: 'Meeting', estimate: '1 hr', description: 'Discussion with client on deliverables and feedback' },
  { label: 'Team Standup / Sync', category: 'Meeting', estimate: '30 mins', description: 'Daily standup, progress status and blockers discussion' },
  { label: 'Code Review & PRs', category: 'Code Review', estimate: '1 hr', description: 'Reviewing pull requests, architectural feedback and QA' },
  { label: 'Production / Ops Support', category: 'Ops & Support', estimate: '2 hrs', description: 'Triaging live incidents, bug fixes, and server maintenance' },
  { label: 'Documentation & Specs', category: 'Documentation', estimate: '1 hr', description: 'Writing API specs, user flows, and technical documentation' },
  { label: 'Knowledge Transfer', category: 'Training', estimate: '1 hr', description: 'Training sessions, onboarding, and knowledge transfer' },
];

interface TodayReport {
  _id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  items: TodayTaskItem[];
  status: 'draft' | 'submitted';
  submittedAt?: string;
  planSubmittedAt?: string;
  eodSubmittedAt?: string;
  eodStatusSubmitted?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

const TIME_TO_MINUTES: { [key: string]: number } = {
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

const formatTime = (dateStr?: string | Date) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const calculateTotalHours = (items?: TodayTaskItem[]) => {
  if (!items || !items.length) return 0;
  const totalMin = items.reduce((sum, item) => sum + (TIME_TO_MINUTES[item.estimateTime] || 0), 0);
  return totalMin / 60;
};

export default function TodayTasksPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [pickedItems, setPickedItems] = useState<TodayTaskItem[]>([]);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [planSubmittedAt, setPlanSubmittedAt] = useState<string | null>(null);
  const [eodSubmittedAt, setEodSubmittedAt] = useState<string | null>(null);
  const [eodStatusSubmitted, setEodStatusSubmitted] = useState<boolean>(false);
  const [submittingEod, setSubmittingEod] = useState<boolean>(false);
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

  // Source tab for picking/creating tasks: 'pms' | 'custom'
  const [taskSourceTab, setTaskSourceTab] = useState<'pms' | 'custom'>('pms');

  // Custom task form state
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('Meeting');
  const [customEstimate, setCustomEstimate] = useState<string>('1 hr');

  // Manager custom task modal state
  const [managerTaskTab, setManagerTaskTab] = useState<'pms' | 'custom'>('pms');
  const [managerCustomTitle, setManagerCustomTitle] = useState<string>('');
  const [managerCustomDescription, setManagerCustomDescription] = useState<string>('');
  const [managerCustomCategory, setManagerCustomCategory] = useState<string>('Meeting');
  const [managerCustomEstimate, setManagerCustomEstimate] = useState<string>('1 hr');

  // Custom Popup Alert Modal State (replaces native window.alert)
  const { addToast } = useToast();
  const [popupModal, setPopupModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showPopup = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setPopupModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  // Manager Remarks Dialog State (replaces native window.prompt)
  const [remarksDialog, setRemarksDialog] = useState<{
    isOpen: boolean;
    reportId: string;
    approval: 'rejected' | 'changes_requested';
    title: string;
    description: string;
    value: string;
  }>({
    isOpen: false,
    reportId: '',
    approval: 'changes_requested',
    title: '',
    description: '',
    value: ''
  });

  const openRemarksDialog = (
    reportId: string,
    approval: 'rejected' | 'changes_requested',
    title: string,
    description: string
  ) => {
    setRemarksDialog({
      isOpen: true,
      reportId,
      approval,
      title,
      description,
      value: ''
    });
  };

  // EOD status visibility - show after initial submission or when editing
  const canEditEodStatus = reportStatus === 'submitted';
  const isEditWindowOpen = editWindowExpiresAt 
    ? new Date() < new Date(editWindowExpiresAt)
    : false;
  
  // Employee edit mode: draft or manager requested changes (disabled when report is approved)
  const isEmployeeEditMode = (reportStatus === 'draft' || managerApproval === 'changes_requested' || isEditWindowOpen) && managerApproval !== 'approved';
  // EOD submission is unlocked if shift end time is reached (or test override active) AND work plan is already submitted
  const isEodAccessible = (isEodUnlocked || testOverride) && reportStatus === 'submitted';

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
          setPlanSubmittedAt(data.userReport.planSubmittedAt || data.userReport.submittedAt || null);
          setEodSubmittedAt(data.userReport.eodSubmittedAt || null);
          setEodStatusSubmitted(Boolean(data.userReport.eodStatusSubmitted));
          setReportId(data.userReport._id || null);
          setEditWindowExpiresAt(data.userReport.editWindowExpiresAt || null);
          setManagerApproval(data.userReport.managerApproval || null);
          setManagerRemarks(data.userReport.managerRemarks || '');
        } else {
          setPickedItems([]);
          setReportStatus('draft');
          setSubmittedAt(null);
          setPlanSubmittedAt(null);
          setEodSubmittedAt(null);
          setEodStatusSubmitted(false);
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
      eodRemarks: '',
      addedAt: new Date().toISOString()
    };
    setPickedItems(prev => [...prev, newItem]);
  };

  // Handle adding custom / other than PMS task
  const handleAddCustomTask = (
    title: string = customTitle,
    category: string = customCategory,
    estimate: string = customEstimate,
    description: string = customDescription
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const catCodeMap: Record<string, string> = {
      'Meeting': 'MEET',
      'Code Review': 'REVIEW',
      'Ops & Support': 'OPS',
      'Documentation': 'DOCS',
      'Training': 'TRAIN',
      'Administrative': 'ADMIN',
      'Other': 'OTHER',
    };
    const code = catCodeMap[category] || 'NON-PMS';
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const newItem: TodayTaskItem = {
      taskId: tempId,
      taskNumber: code,
      title: trimmedTitle,
      description: description.trim(),
      currentStatus: 'In Progress',
      estimateTime: estimate || '1 hr',
      eodStatus: 'in_progress',
      eodRemarks: '',
      isCustom: true,
      category,
      addedAt: new Date().toISOString()
    };

    setPickedItems(prev => [...prev, newItem]);
    setCustomTitle('');
    setCustomDescription('');
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
        addToast({ type: 'info', title: 'Task Removed', description: 'Item removed from today plan.' });
      } else {
        alert(data.message || 'Failed to remove task');
        showPopup('Failed to Remove Task', data.message || 'Failed to remove task from report', 'error');
        fetchData();
      }
    } catch (err) {
      console.error('Error removing task:', err);
      alert('Network error removing task');
      showPopup('Network Error', 'Network error removing task from report', 'error');
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
      showPopup('Action Required', 'Please submit your task plan first before updating EOD status.', 'warning');
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
        addToast({ type: 'success', title: 'EOD Status Saved', description: 'Your EOD status has been recorded.' });
      } else {
        alert('Failed to update EOD status');
        showPopup('Update Failed', 'Failed to update EOD status.', 'error');
      }
    } catch (err) {
      console.error('Error updating EOD status:', err);
      alert('Network error updating EOD status');
      showPopup('Network Error', 'Network error updating EOD status', 'error');
    }
  };

  // Submit full EOD status report at shift end
  const handleSubmitEodReport = async () => {
    if (reportStatus !== 'submitted') {
      showPopup('Action Required', 'Please submit your work plan first before submitting EOD status.', 'warning');
      return;
    }

    try {
      setSubmittingEod(true);
      const currentReportId = reportId || companyReports.find(r => r.userId === user?.id)?._id;
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReportId,
          action: 'submit_eod',
          items: pickedItems
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEodStatusSubmitted(true);
        setEodSubmittedAt(data.report?.eodSubmittedAt || new Date().toISOString());
        showPopup('EOD Status Submitted', 'Your End-of-Day status update has been successfully submitted to your manager.', 'success');
        addToast({ type: 'success', title: 'EOD Report Submitted', description: 'Your EOD report for today has been recorded.' });
        fetchData();
      } else {
        showPopup('Submission Failed', data.message || 'Failed to submit EOD status.', 'error');
      }
    } catch (err) {
      console.error('Error submitting EOD:', err);
      showPopup('Network Error', 'Network error submitting EOD status', 'error');
    } finally {
      setSubmittingEod(false);
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
        const label = approval === 'approved' ? 'approved' : approval === 'rejected' ? 'rejected' : 'changes requested';
        showPopup('Report Status Updated', `The report has been ${label} successfully.`, 'success');
        addToast({ type: 'success', title: 'Updated', description: `Report ${label}.` });
        fetchData();
      } else {
        alert('Failed to update approval status');
        showPopup('Approval Failed', 'Failed to update report approval status.', 'error');
      }
    } catch (err) {
      console.error('Error updating approval:', err);
      alert('Network error updating approval');
      showPopup('Network Error', 'Network error updating report approval status.', 'error');
    }
  };

  // Submit report
  const handleSubmitReport = async (action: 'save_draft' | 'submit') => {
    if (pickedItems.length === 0) {
      alert('Please pick at least one task for today!');
      showPopup('No Tasks Selected', 'Please select PMS tickets or add other non-PMS work before submitting today\'s plan.', 'warning');
      return;
    }

    const totalMinutes = pickedItems.reduce((sum, item) => {
      return sum + (TIME_TO_MINUTES[item.estimateTime] || 0);
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
        setPlanSubmittedAt(data.report.planSubmittedAt || data.report.submittedAt || null);
        setReportId(data.report._id || null);
        setEmployeeComment('');
        setShowCommentModal(false);
        alert(data.message);
        showPopup(
          action === 'submit' ? "Submitted to Management!" : "Draft Saved",
          data.message || (action === 'submit' ? "Today's Task & EOD Report submitted to manager successfully!" : "Your tasks draft has been saved."),
          'success'
        );
        addToast({ 
          type: 'success', 
          title: action === 'submit' ? 'Plan Submitted' : 'Draft Saved', 
          description: data.message 
        });
        fetchData();
      } else {
        if (data.requiresComment) {
          setTotalHours(data.totalHours);
          setShowCommentModal(true);
        } else {
          alert(data.message || 'Failed to submit report');
          showPopup('Submission Failed', data.message || 'Failed to submit report', 'error');
        }
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Network error submitting report');
      showPopup('Network Error', 'Network error submitting report', 'error');
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
        addToast({ type: 'success', title: 'Comment Posted', description: 'Your comment was added.' });
        fetchData();
      } else {
        alert('Failed to add comment');
        showPopup('Comment Failed', 'Failed to add comment', 'error');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Network error adding comment');
      showPopup('Network Error', 'Network error adding comment', 'error');
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
        showPopup('Edit Window Granted', 'Edit window extended for 1 hour. You can now modify your task plan and re-submit.', 'success');
        addToast({ type: 'info', title: 'Edit Window Active', description: 'Available for 1 hour.' });
        fetchData();
      } else {
        alert('Failed to request edit');
        showPopup('Request Failed', 'Failed to request edit permission.', 'error');
      }
    } catch (err) {
      console.error('Error requesting edit:', err);
      alert('Network error requesting edit');
      showPopup('Network Error', 'Network error requesting edit', 'error');
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
        showPopup('Task Added', `"${task.title}" added to ${selectedReportForTask.userName}'s plan.`, 'success');
        setShowAddTaskModal(false);
        setSelectedReportForTask(null);
        setEmployeeAssignedTasks([]);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to add task');
        showPopup('Cannot Add Task', data.message || 'Failed to add task', 'error');
      }
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Network error adding task');
      showPopup('Network Error', 'Network error adding task', 'error');
    }
  };

  // Manager add custom / other than PMS task to employee's plan
  const handleAddCustomTaskToEmployee = async () => {
    if (!selectedReportForTask?._id || !managerCustomTitle.trim()) return;

    const catCodeMap: Record<string, string> = {
      'Meeting': 'MEET',
      'Code Review': 'REVIEW',
      'Ops & Support': 'OPS',
      'Documentation': 'DOCS',
      'Training': 'TRAIN',
      'Administrative': 'ADMIN',
      'Other': 'OTHER',
    };
    const code = catCodeMap[managerCustomCategory] || 'NON-PMS';

    try {
      const res = await fetch('/api/today-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForTask._id,
          action: 'add_task_to_employee',
          task: {
            taskNumber: code,
            title: managerCustomTitle.trim(),
            description: managerCustomDescription.trim(),
            currentStatus: 'In Progress',
            estimateTime: managerCustomEstimate || '1 hr',
            isCustom: true,
            category: managerCustomCategory,
          }
        })
      });

      if (res.ok) {
        alert('Custom task added to employee plan successfully');
        showPopup('Custom Task Added', `"${managerCustomTitle.trim()}" added to ${selectedReportForTask.userName}'s plan.`, 'success');
        setShowAddTaskModal(false);
        setSelectedReportForTask(null);
        setManagerCustomTitle('');
        setManagerCustomDescription('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to add custom task');
        showPopup('Cannot Add Task', data.message || 'Failed to add custom task', 'error');
      }
    } catch (err) {
      console.error('Error adding custom task to employee:', err);
      alert('Network error adding custom task');
      showPopup('Network Error', 'Network error adding custom task', 'error');
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto pb-12 font-sans">
      {/* Page Header */}
      <PageHeader
        icon={<CheckSquare />}
        title="Today Task & EOD Status"
        description={
          isAdminView
            ? 'Review submitted employee daily task plans and EOD status updates across the company'
            : 'Plan your daily task completion estimates and submit EOD progress directly to management'
        }
        actions={
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="bg-transparent border-none focus:outline-none text-xs font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>

            {!isAdminView && companyReports.length > 0 && (
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 dark:bg-slate-800">
                <button
                  onClick={() => setActiveTab('my_tasks')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'my_tasks' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  My Today Task
                </button>
                <button
                  onClick={() => setActiveTab('team_eod')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'team_eod' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Team EOD Reports ({companyReports.length})
                </button>
              </div>
            )}
          </div>
        }
      />

      {activeTab === 'my_tasks' && !isAdminView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pick Assigned Tickets - Show in edit mode */}
          {isEmployeeEditMode && (
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-700">
                {/* Source Selection Tabs: PMS Tasks vs Other / Non-PMS Work */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setTaskSourceTab('pms')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      taskSourceTab === 'pms'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span className="truncate">PMS Tasks ({assignedTasks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskSourceTab('custom')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      taskSourceTab === 'custom'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="truncate">Other Work</span>
                  </button>
                </div>

                {taskSourceTab === 'pms' ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <span>Assigned PMS Tickets</span>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold dark:bg-indigo-500/10 dark:text-indigo-300">Pick for today</span>
                    </div>

                    {assignedTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No open tickets assigned to you right now.</p>
                        <button
                          type="button"
                          onClick={() => setTaskSourceTab('custom')}
                          className="text-xs text-indigo-600 hover:underline font-bold dark:text-indigo-400"
                        >
                          + Add other non-PMS work
                        </button>
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
                                  ? 'bg-slate-50 border-slate-200 opacity-60 dark:bg-slate-800/50 dark:border-slate-700' 
                                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm dark:bg-slate-900 dark:border-slate-700'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold dark:bg-slate-800 dark:text-slate-300">{task.taskNumber}</span>
                                  <span className="text-[9px] uppercase font-bold text-slate-400">{task.taskType}</span>
                                </div>
                                <p className="font-bold text-slate-800 truncate text-[11px] dark:text-slate-200">{task.title}</p>
                              </div>
                              
                              <button
                                onClick={() => handlePickTask(task)}
                                disabled={isPicked}
                                className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                  isPicked 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' 
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400'
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
                  </>
                ) : (
                  /* Custom / Non-PMS Form & Quick Presets */
                  <div className="space-y-4">
                    <div className="space-y-3 p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Task / Activity Title *
                        </label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="e.g. Client Call, Code Review, Docs..."
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Description / Details
                        </label>
                        <textarea
                          value={customDescription}
                          onChange={(e) => setCustomDescription(e.target.value)}
                          placeholder="Add details, agenda, or deliverables for this task..."
                          rows={2}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Category
                          </label>
                          <select
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                          >
                            {CUSTOM_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Estimate
                          </label>
                          <select
                            value={customEstimate}
                            onChange={(e) => setCustomEstimate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                          >
                            {ESTIMATE_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddCustomTask()}
                        disabled={!customTitle.trim()}
                        className="w-full text-xs font-semibold gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Today's Plan
                      </Button>
                    </div>

                    {/* 1-Click Quick Presets */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Quick Add Presets (1-Click)
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {PRESET_WORK.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleAddCustomTask(preset.label, preset.category, preset.estimate, preset.description)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 bg-white dark:bg-slate-900 text-left text-xs flex items-center justify-between group transition-all"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {preset.label}
                              </p>
                              <span className="text-[9px] text-slate-400">
                                {preset.category} • {preset.estimate}
                              </span>
                            </div>
                            <span className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 opacity-80 group-hover:opacity-100 shrink-0">
                              <Plus className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column: Tabular Plan & EOD Status Submission */}
          <div className={`${isEmployeeEditMode ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-bold text-slate-800 text-base flex flex-wrap items-center gap-2 dark:text-slate-200">
                    {isEmployeeEditMode ? "Today's Work Plan (Morning)" : "Today's Task Plan & EOD"}
                    {(planSubmittedAt || submittedAt) && (
                      <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Plan Added: {formatTime(planSubmittedAt || submittedAt)}
                      </span>
                    )}
                    {pickedItems.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30">
                        Total: {calculateTotalHours(pickedItems)} hrs
                      </span>
                    )}
                    {reportStatus === 'submitted' && (
                      <>
                        <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">
                          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Plan Submitted
                        </span>
                        {eodStatusSubmitted ? (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            EOD Submitted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            EOD Pending
                          </span>
                        )}
                        {managerApproval === 'changes_requested' ? (
                          <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold uppercase dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Changes Requested
                          </span>
                        ) : managerApproval === 'approved' ? (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold uppercase dark:bg-emerald-500/10 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Approved
                          </span>
                        ) : null}
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEmployeeEditMode 
                      ? "Add tickets and allocated time for your daily work plan, then submit to your manager." 
                      : "Work plan logged. End-of-day completion status will be submitted at shift end."}
                  </p>
                </div>

                {isEmployeeEditMode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmitReport('save_draft')}
                      disabled={submitting || pickedItems.length === 0}
                      className="text-xs rounded-xl border-slate-200 dark:border-slate-700"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSubmitReport('submit')}
                      disabled={submitting || pickedItems.length === 0}
                      className="text-xs font-semibold"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      {managerApproval === 'changes_requested' ? 'Re-submit Plan' : 'Submit Work Plan'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {isEodAccessible ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmitEodReport}
                        disabled={submittingEod}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                      >
                        {submittingEod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {eodStatusSubmitted ? 'Update EOD Report' : 'Submit EOD Report'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>EOD unlocks at {unlockTimeStr}</span>
                      </div>
                    )}
                    {managerApproval !== 'approved' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reportId && handleRequestEdit(reportId)}
                        className="text-xs rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50 flex items-center gap-1.5 dark:border-amber-500/30 dark:text-amber-300"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Request Edit Permission
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {(managerRemarks || managerApproval === 'changes_requested') && (
                <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-xl flex items-start gap-3 shadow-sm dark:bg-amber-500/10">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-amber-900 text-xs">Manager Remarks / Feedback</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold uppercase dark:bg-amber-500/15 dark:text-amber-300">
                        {managerApproval === 'changes_requested' ? 'Changes Requested' : 'Manager Comment'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-semibold dark:text-amber-300">
                      {managerRemarks ? `"${managerRemarks}"` : 'Manager requested changes to your task plan. You can edit tickets and estimates on the left and re-submit.'}
                    </p>
                  </div>
                </div>
              )}

              {reportStatus === 'submitted' && (
                <>
                  {/* Employee Comment Section */}
                  {companyReports.find(r => r._id === reportId)?.employeeComment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-500/10 dark:border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Your Comment:</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">{companyReports.find(r => r._id === reportId)?.employeeComment}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 dark:bg-slate-800/50 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Comments</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {companyReports.find(r => r._id === reportId)?.comments.map((comment) => (
                        <div key={comment.id} className={`p-2 rounded-lg text-xs ${comment.isManager ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{comment.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                            {comment.isManager && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold dark:bg-indigo-500/15 dark:text-indigo-300">Manager</span>}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/20 dark:bg-slate-900 dark:border-slate-700"
                      />
                      <Button
                        size="sm"
                        onClick={() => reportId && handleAddComment(reportId, newComment)}
                        disabled={!newComment.trim()}
                        className="text-xs"
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
                      className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300"
                    >
                      Request Edit Window
                    </Button>
                  )}
                </>
              )}

              {/* Workflow Phase Indicator Banner */}
              {pickedItems.length > 0 && (
                <>
                  {isEmployeeEditMode ? (
                    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex items-center gap-3 text-xs text-indigo-900 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-200">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Phase 1: Morning Work Plan</span>
                        <p className="text-slate-500 text-[11px] dark:text-slate-400">Add tasks and estimate times for today. Submit when ready — EOD status will be recorded when your shift ends.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!eodStatusSubmitted && !isEodAccessible && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs dark:bg-amber-500/10 dark:border-amber-500/30">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-900 dark:text-amber-200">Phase 2: Shift in Progress (Plan Submitted)</span>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px]">Work plan logged. EOD status submission unlocks at <strong>{unlockTimeStr}</strong> (30 mins before shift end).</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTestOverride(true)}
                            className="text-[11px] font-semibold text-amber-700 underline hover:text-amber-900 dark:text-amber-300 shrink-0"
                          >
                            Unlock EOD early
                          </button>
                        </div>
                      )}

                      {!eodStatusSubmitted && isEodAccessible && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/30">
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs">Phase 3: Shift End Reached — Submit Your EOD Status</h4>
                              <p className="text-emerald-800 dark:text-emerald-300 text-[11px]">Select EOD status for each task below, add remarks, and click Submit EOD Report.</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmitEodReport}
                            disabled={submittingEod}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
                          >
                            {submittingEod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Submit EOD Report
                          </Button>
                        </div>
                      )}

                      {eodStatusSubmitted && (
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-bold">EOD Status Submitted for Today ({formatTime(eodSubmittedAt)})</span>
                              <p className="text-slate-500 text-[11px] dark:text-slate-400">All tasks recorded. You can adjust statuses and update the report if needed.</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleSubmitEodReport}
                            disabled={submittingEod}
                            className="text-xs rounded-xl"
                          >
                            Update EOD
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {pickedItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/70">
                  <Sparkles className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm dark:text-slate-300">No tasks picked for today yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Select tickets from your assigned tasks list on the left to build today's plan and set estimates.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs font-medium">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px] dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Ticket ID</th>
                        <th className="px-4 py-3">Title</th>
                        {isEmployeeEditMode && <th className="px-4 py-3">Status</th>}
                        <th className="px-4 py-3">Estimate Time</th>
                        <th className="px-4 py-3">Time Added</th>
                        {!isEmployeeEditMode && (
                          <>
                            <th className="px-4 py-3">EOD Status</th>
                            <th className="px-4 py-3">Remarks</th>
                          </>
                        )}
                        {isEmployeeEditMode && <th className="px-4 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                      {pickedItems.map((item) => (
                        <tr key={item.taskId} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/70">
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-300">
                            {item.isCustom ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30">
                                {item.taskNumber || 'NON-PMS'}
                              </span>
                            ) : (
                              item.taskNumber
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-xs dark:text-slate-200">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                                {item.isCustom && item.category && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400 font-normal">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </td>
                          {isEmployeeEditMode && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase dark:bg-indigo-500/10 dark:text-indigo-300">
                                {item.currentStatus.replace('_', ' ')}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.estimateTime}
                              onChange={(e) => handleUpdateItem(item.taskId, 'estimateTime', e.target.value)}
                              disabled={!isEmployeeEditMode}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none ${
                                !isEmployeeEditMode 
                                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400' 
                                  : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-400/20 text-slate-800 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {ESTIMATE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px] dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTime(item.addedAt || planSubmittedAt || submittedAt)}
                            </span>
                          </td>
                          {!isEmployeeEditMode && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isEodAccessible ? (
                                  <select
                                    value={item.eodStatus}
                                    onChange={(e) => handleUpdateItem(item.taskId, 'eodStatus', e.target.value as any)}
                                    className={`px-2 py-1 border rounded-lg text-xs font-bold focus:outline-none transition-all cursor-pointer ${
                                      item.eodStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300' :
                                      item.eodStatus === 'blocked' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300' :
                                      item.eodStatus === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300' :
                                      'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="blocked">Blocked</option>
                                    <option value="pending">Pending</option>
                                  </select>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                                    Pending Shift End
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEodAccessible ? (
                                  <input
                                    type="text"
                                    value={item.eodRemarks || ''}
                                    onChange={(e) => handleUpdateItem(item.taskId, 'eodRemarks', e.target.value)}
                                    placeholder="Add EOD notes..."
                                    className="px-2.5 py-1 w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-xs focus:outline-none text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                                  />
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Unlocks at {unlockTimeStr}</span>
                                )}
                              </td>
                            </>
                          )}
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 dark:bg-slate-900 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-slate-800 text-lg dark:text-slate-200">Team EOD Reports ({companyReports.length})</h2>
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
                <div key={report._id} className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {report.userName ? report.userName.slice(0, 2).toUpperCase() : 'EM'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm dark:text-slate-200">{report.userName}</h4>
                        <p className="text-[10px] text-slate-400">{report.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Plan submission timestamp & status */}
                      {report.status === 'submitted' ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">
                          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Plan Added: {formatTime(report.planSubmittedAt || report.submittedAt || report.createdAt)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Plan Draft
                        </span>
                      )}

                      {/* EOD submission badge */}
                      {report.status === 'submitted' && (
                        report.eodStatusSubmitted ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            EOD Submitted: {formatTime(report.eodSubmittedAt)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            EOD Pending (Shift in Progress)
                          </span>
                        )
                      )}

                      {/* Total hours */}
                      {report.items && report.items.length > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30">
                          Total: {calculateTotalHours(report.items)} hrs
                        </span>
                      )}

                      {/* Manager Approval */}
                      {report.managerApproval && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          report.managerApproval === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' :
                          report.managerApproval === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' :
                          report.managerApproval === 'changes_requested' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' :
                          'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          {report.managerApproval === 'approved' ? 'Approved' :
                           report.managerApproval === 'rejected' ? 'Rejected' :
                           report.managerApproval === 'changes_requested' ? 'Changes Requested' : 'Review Pending'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px] dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400">
                        <tr>
                          <th className="px-3.5 py-2.5">Ticket ID</th>
                          <th className="px-3.5 py-2.5">Title</th>
                          <th className="px-3.5 py-2.5">Estimate</th>
                          <th className="px-3.5 py-2.5">Time Added</th>
                          <th className="px-3.5 py-2.5">EOD Status</th>
                          <th className="px-3.5 py-2.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {report.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.isCustom ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30">
                                  {item.taskNumber || 'NON-PMS'}
                                </span>
                              ) : (
                                item.taskNumber
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold">{item.title}</span>
                                  {item.isCustom && item.category && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                      {item.category}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[10px] text-slate-500 line-clamp-2 dark:text-slate-400 font-normal">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-indigo-600 font-bold dark:text-indigo-400">{item.estimateTime}</td>
                            <td className="px-3.5 py-2.5 text-slate-500 text-[11px] whitespace-nowrap dark:text-slate-400 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatTime(item.addedAt || report.submittedAt || report.createdAt)}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              {report.eodStatusSubmitted ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.eodStatus === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' :
                                  item.eodStatus === 'blocked' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' :
                                  item.eodStatus === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' :
                                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {item.eodStatus.replace('_', ' ')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  Pending Shift End
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500 italic text-[11px] dark:text-slate-400">
                              {report.eodStatusSubmitted 
                                ? (item.eodRemarks || '-') 
                                : <span className="text-slate-400 text-[10px] not-italic">Awaiting shift end</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Employee Comment */}
                  {report.employeeComment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 dark:bg-blue-500/10 dark:border-blue-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">Employee Comment:</span>
                      </div>
                      <p className="text-[10px] text-blue-700 dark:text-blue-300">{report.employeeComment}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  {report.comments && report.comments.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 dark:bg-slate-800/50 dark:border-slate-700">
                      <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Comments</h4>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {report.comments.map((comment) => (
                          <div key={comment.id} className={`p-1.5 rounded-lg text-[10px] ${comment.isManager ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{comment.userName}</span>
                              <span className="text-[9px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                              {comment.isManager && <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold dark:bg-indigo-500/15 dark:text-indigo-300">Manager</span>}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manager Actions */}
                  {isAdminView && report.status === 'submitted' && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                      {report.managerApproval === 'approved' || report.managerApproval === 'rejected' ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl dark:bg-slate-800/50 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            {report.managerApproval === 'approved' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Report Approved by Manager</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 dark:text-rose-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Report Rejected by Manager</span>
                              </>
                            )}
                            {report.managerRemarks && (
                              <span className="text-xs text-slate-500 font-medium ml-2 dark:text-slate-400">
                                — "{report.managerRemarks}"
                              </span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              openRemarksDialog(
                                report._id || '',
                                'changes_requested',
                                'Re-open & Request Changes',
                                `Enter instructions or changes required for ${report.userName}:`
                              );
                            }}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline shrink-0 transition-colors dark:text-amber-300"
                          >
                            Re-open / Request Changes
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Manager Actions:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleManagerApproval(report._id || '', 'approved', '')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                openRemarksDialog(
                                  report._id || '',
                                  'rejected',
                                  'Reject Report',
                                  `Enter the rejection reason for ${report.userName}:`
                                );
                              }}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs rounded-lg dark:border-rose-500/30 dark:text-rose-400 shadow-2xs"
                            >
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                openRemarksDialog(
                                  report._id || '',
                                  'changes_requested',
                                  'Request Changes',
                                  `Specify the changes requested from ${report.userName}:`
                                );
                              }}
                              className="border-amber-200 text-amber-600 hover:bg-amber-50 text-xs rounded-lg dark:border-amber-500/30 dark:text-amber-400 shadow-2xs"
                            >
                              Request Changes
                            </Button>
                            {(report.editWindowExpiresAt && new Date() < new Date(report.editWindowExpiresAt)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAddTaskModal(report)}
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs rounded-lg dark:border-indigo-500/30 dark:text-indigo-400"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Task
                              </Button>
                            )}
                          </div>
                          {report.managerRemarks && (
                            <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Work Time Less Than 8 Hours</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 dark:text-slate-400">
              Your total estimated work time is <span className="font-bold text-amber-600 dark:text-amber-400">{totalHours.toFixed(1)} hours</span>. 
              Please add a comment explaining this to your manager before submitting.
            </p>
            <textarea
              value={employeeComment}
              onChange={(e) => setEmployeeComment(e.target.value)}
              placeholder="Explain why your work time is less than 8 hours..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20 resize-none dark:border-slate-700"
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
                className="flex-1 text-sm"
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
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] flex flex-col dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Plus className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Add Task to Employee's Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedReportForTask.userName}</p>
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

            {/* Manager Modal Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 mb-4 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setManagerTaskTab('pms')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  managerTaskTab === 'pms'
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>PMS Tickets ({employeeAssignedTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setManagerTaskTab('custom')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  managerTaskTab === 'custom'
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Other / Non-PMS Work</span>
              </button>
            </div>

            {managerTaskTab === 'pms' ? (
              employeeAssignedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No assigned PMS tasks available for this employee.</p>
                  <button
                    type="button"
                    onClick={() => setManagerTaskTab('custom')}
                    className="text-xs text-indigo-600 hover:underline font-bold dark:text-indigo-400"
                  >
                    + Add other non-PMS work
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {employeeAssignedTasks.map((task) => {
                    const isAlreadyAdded = selectedReportForTask.items.some(i => i.taskId === task._id);
                    return (
                      <div 
                        key={task._id} 
                        className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                          isAlreadyAdded 
                            ? 'bg-slate-50 border-slate-200 opacity-60 dark:bg-slate-800/50 dark:border-slate-700' 
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm dark:bg-slate-900 dark:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold dark:bg-slate-800 dark:text-slate-300">{task.taskNumber}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">{task.taskType}</span>
                          </div>
                          <p className="font-bold text-slate-800 truncate text-[11px] dark:text-slate-200">{task.title}</p>
                        </div>
                        
                        <button
                          onClick={() => handleAddTaskToEmployee(task)}
                          disabled={isAlreadyAdded}
                          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                            isAlreadyAdded 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' 
                              : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400'
                          }`}
                          title={isAlreadyAdded ? 'Already added' : 'Add to plan'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Manager Custom Non-PMS Task Form */
              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={managerCustomTitle}
                    onChange={(e) => setManagerCustomTitle(e.target.value)}
                    placeholder="e.g. Client review, sprint planning, infra support..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Instructions (Optional)
                  </label>
                  <textarea
                    value={managerCustomDescription}
                    onChange={(e) => setManagerCustomDescription(e.target.value)}
                    placeholder="Add task instructions or notes for the employee..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={managerCustomCategory}
                      onChange={(e) => setManagerCustomCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {CUSTOM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Estimate Time
                    </label>
                    <select
                      value={managerCustomEstimate}
                      onChange={(e) => setManagerCustomEstimate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {ESTIMATE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleAddCustomTaskToEmployee()}
                  disabled={!managerCustomTitle.trim()}
                  className="w-full text-xs font-semibold gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Non-PMS Task to Employee's Plan
                </Button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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

      {/* Custom Popup Alert / Confirmation Modal (Replaces browser native window.alert) */}
      {popupModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-150">
            {/* Animated Icon */}
            <div className="flex justify-center">
              {popupModal.type === 'success' && (
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
              )}
              {popupModal.type === 'error' && (
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                  <AlertCircle className="w-9 h-9" />
                </div>
              )}
              {popupModal.type === 'warning' && (
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                  <AlertCircle className="w-9 h-9" />
                </div>
              )}
              {popupModal.type === 'info' && (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Sparkles className="w-9 h-9" />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {popupModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                {popupModal.message}
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => setPopupModal(prev => ({ ...prev, isOpen: false }))}
                className={`w-full py-2.5 text-xs font-bold rounded-xl shadow-md transition-all ${
                  popupModal.type === 'success' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' 
                    : popupModal.type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                    : popupModal.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                }`}
              >
                Okay, Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Remarks Modal (Replaces browser native window.prompt for manager actions) */}
      {remarksDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full mx-auto shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${remarksDialog.approval === 'rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {remarksDialog.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemarksDialog(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {remarksDialog.description}
            </p>

            <textarea
              value={remarksDialog.value}
              onChange={(e) => setRemarksDialog(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter remarks or feedback here..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 resize-none"
              autoFocus
            />

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRemarksDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleManagerApproval(remarksDialog.reportId, remarksDialog.approval, remarksDialog.value);
                  setRemarksDialog(prev => ({ ...prev, isOpen: false }));
                }}
                disabled={!remarksDialog.value.trim()}
                className={`flex-1 text-xs font-semibold text-white ${
                  remarksDialog.approval === 'rejected'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
