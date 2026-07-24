"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  KanbanSquare, Search, Filter, Clock, CheckCircle, XCircle, 
  Calendar, User, Plus, Edit, Trash2, MoreHorizontal, ChevronDown, ChevronUp,
  AlertCircle, Play, Pause, Square, GripVertical, X, CornerDownRight, Link2
} from "lucide-react";

interface TaskItem {
  _id: string;
  taskNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  taskType?: string;
  projectId: { _id: string; name: string; projectNumber: string };
  assignedTo?: { _id: string; name: string; email?: string; department?: string };
  assignedBy: { _id: string; name: string };
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  parentId?: { _id: string; taskNumber: string; title: string; status: string } | string | null;
  progressPercentage?: number;
  dependsOn?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  blocks?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  tags?: string[];
  comments?: Array<{ _id: string; userId: string; userName: string; text: string; createdAt: string }>;
  createdAt?: string;
  createdBy?: { _id: string; name: string };
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  to_do: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const boardStatusLabels: Record<string, string> = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const taskTypeLabels: Record<string, string> = {
  task: 'Task',
  story: 'Story',
  bug: 'Bug',
  epic: 'Epic',
  subtask: 'Subtask',
  improvement: 'Improvement',
};

const taskTypeColors: Record<string, string> = {
  task: 'bg-gray-100 text-gray-700',
  story: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  epic: 'bg-purple-100 text-purple-700',
  subtask: 'bg-green-100 text-green-700',
  improvement: 'bg-orange-100 text-orange-700',
};

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  to_do: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusThemes: Record<string, { dot: string; headerText: string; lightBg: string; border: string }> = {
  backlog: { dot: 'bg-slate-400', headerText: 'text-slate-800', lightBg: 'bg-slate-50/50', border: 'border-slate-200/50' },
  to_do: { dot: 'bg-blue-500', headerText: 'text-slate-800', lightBg: 'bg-blue-50/40', border: 'border-blue-200/40' },
  in_progress: { dot: 'bg-amber-500', headerText: 'text-slate-800', lightBg: 'bg-amber-50/40', border: 'border-amber-200/40' },
  in_review: { dot: 'bg-purple-500', headerText: 'text-slate-800', lightBg: 'bg-purple-50/40', border: 'border-purple-200/40' },
  completed: { dot: 'bg-emerald-500', headerText: 'text-slate-800', lightBg: 'bg-emerald-50/40', border: 'border-emerald-200/40' },
  cancelled: { dot: 'bg-rose-500', headerText: 'text-slate-800', lightBg: 'bg-rose-50/40', border: 'border-rose-200/40' },
};

export default function TasksManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [projectBoard, setProjectBoard] = useState<any>(null);
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState<TaskItem[]>([]);
  const [backlogSearchQuery, setBacklogSearchQuery] = useState('');
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('comments');
  const [newComment, setNewComment] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [linkTaskId, setLinkTaskId] = useState('');
  const [linkType, setLinkType] = useState<'blocks' | 'dependsOn'>('dependsOn');
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('medium');
  const [showAddSubtaskForm, setShowAddSubtaskForm] = useState(false);

  // Fetch backlog tasks when modal opens
  useEffect(() => {
    if (showBacklogModal) {
      fetchBacklogTasks();
    }
  }, [showBacklogModal]);

  // Mention handlers
  const employeesList = useMemo(() => {
    return employees.map((e: any) => ({
      _id: e._id,
      name: e.name,
      email: e.email
    }));
  }, [employees]);

  const filteredMentionMembers = useMemo(() => {
    if (!mentionQuery) return employeesList;
    const q = mentionQuery.toLowerCase();
    return employeesList.filter((m: any) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)));
  }, [employeesList, mentionQuery]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const match = val.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
    }
  };

  const handleSelectMention = (memberName: string) => {
    setNewComment(prev => {
      const match = prev.match(/@([^\s@]*)$/);
      if (match) {
        return prev.replace(/@([^\s@]*)$/, `@${memberName} `);
      }
      return prev + `@${memberName} `;
    });
    setShowMentionList(false);
    setMentionQuery('');
  };

  const handleInsertMentionFromBadge = (memberName: string) => {
    setNewComment(prev => prev + `@${memberName} `);
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'to_do',
    priority: 'medium',
    taskType: 'task',
    projectId: '',
    assignedTo: '',
    assignedBy: '',
    dueDate: '',
    startDate: '',
    storyPoints: '',
    estimatedHours: '',
    actualHours: '',
    parentId: '',
    tags: '',
    linkedItems: '',
    initialComment: '',
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (user?.companyId) {
      fetchTasks();
    }
  }, [user?.companyId, filterStatus, filterPriority]);

  useEffect(() => {
    if (user?.companyId) {
      fetchProjects();
      fetchEmployees();
    }
  }, [user?.companyId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/users?companyId=${user?.companyId}`);
      const data = await response.json();
      setEmployees(data.users || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleOpenCreateModal = (statusValue?: string) => {
    setFormData({
      title: '',
      description: '',
      status: statusValue || 'to_do',
      priority: 'medium',
      taskType: 'task',
      projectId: '',
      assignedTo: '',
      assignedBy: '',
      dueDate: '',
      startDate: '',
      storyPoints: '',
      estimatedHours: '',
      actualHours: '',
      parentId: '',
      tags: '',
      linkedItems: '',
      initialComment: '',
    });
    setShowCreateModal(true);
  };

  const [projectTasks, setProjectTasks] = useState<any[]>([]);

  const fetchProjectTasks = async (pId: string) => {
    if (!pId) return;
    try {
      const res = await fetch(`/api/tasks?projectId=${pId}`);
      const data = await res.json();
      
      const backlogRes = await fetch(`/api/backlog?projectId=${pId}`);
      const backlogData = await backlogRes.json();
      
      setProjectTasks([...(data.tasks || []), ...(backlogData.tasks || [])]);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubtasks = async (parentTaskId: string) => {
    try {
      const response = await fetch(`/api/tasks?parentId=${parentTaskId}`);
      const data = await response.json();
      setSubtasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };

  const handleOpenEditModal = (task: TaskItem) => {
    if (!task.projectId) {
      addToast({ type: 'error', title: 'Error', description: 'Task has no project assigned' });
      return;
    }
    
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      taskType: task.taskType || 'task',
      projectId: task.projectId._id,
      assignedTo: task.assignedTo?._id || '',
      assignedBy: task.assignedBy?._id || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      storyPoints: task.storyPoints?.toString() || '',
      estimatedHours: task.estimatedHours?.toString() || '',
      actualHours: task.actualHours?.toString() || '',
      parentId: (typeof task.parentId === 'object' ? task.parentId?._id : task.parentId) || '',
      tags: task.tags?.join(', ') || '',
      linkedItems: '',
      initialComment: '',
    });
    fetchProjectTasks(task.projectId._id);
    fetchSubtasks(task._id);
    setShowEditModal(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask._id,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          taskType: formData.taskType,
          projectId: formData.projectId,
          assignedTo: formData.assignedTo || null,
          dueDate: formData.dueDate || null,
          startDate: formData.startDate || null,
          storyPoints: formData.storyPoints ? parseFloat(formData.storyPoints) : null,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
          actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
          parentId: formData.parentId || null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task updated" });
        setShowEditModal(false);
        setSelectedTask(null);
        fetchTasks();
        fetchBacklogTasks();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update task" });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      const response = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTask._id, text: newComment }),
      });
      if (response.ok) {
        const data = await response.json();
        addToast({ type: 'success', title: 'Comment added', description: 'Your comment has been saved.' });
        setNewComment('');
        setSelectedTask({ ...selectedTask, comments: data.comments });
        fetchTasks();
        fetchBacklogTasks();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to add comment' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    try {
      const response = await fetch(`/api/tasks/comments?taskId=${selectedTask._id}&commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        addToast({ type: 'success', title: 'Comment deleted', description: 'Your comment has been deleted.' });
        setSelectedTask({ ...selectedTask, comments: data.comments });
        fetchTasks();
        fetchBacklogTasks();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to delete comment' });
    }
  };

  const handleAddLink = async () => {
    if (!selectedTask || !linkTaskId) return;
    try {
      const response = await fetch('/api/tasks/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask._id,
          targetTaskId: linkTaskId,
          linkType: linkType,
        }),
      });
      if (response.ok) {
        addToast({ type: 'success', title: 'Link added', description: 'Tasks linked successfully.' });
        setLinkTaskId('');
        
        // Refresh selected task details to show link
        const tasksRes = await fetch(`/api/tasks?projectId=${selectedTask.projectId._id}`);
        const tasksData = await tasksRes.json();
        const freshTask = tasksData.tasks.find((t: any) => t._id === selectedTask._id);
        if (freshTask) {
          setSelectedTask(freshTask);
        }
        fetchTasks();
        fetchBacklogTasks();
        fetchProjectTasks(selectedTask.projectId._id);
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to link tasks' });
    }
  };

  const handleDeleteLink = async (targetTaskId: string, type: 'dependsOn' | 'blocks') => {
    if (!selectedTask) return;
    try {
      const response = await fetch(`/api/tasks/link?taskId=${selectedTask._id}&targetTaskId=${targetTaskId}&linkType=${type}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast({ type: 'success', title: 'Link removed', description: 'Link deleted successfully.' });
        
        // Refresh selected task details
        const tasksRes = await fetch(`/api/tasks?projectId=${selectedTask.projectId._id}`);
        const tasksData = await tasksRes.json();
        const freshTask = tasksData.tasks.find((t: any) => t._id === selectedTask._id);
        if (freshTask) {
          setSelectedTask(freshTask);
        }
        fetchTasks();
        fetchBacklogTasks();
        fetchProjectTasks(selectedTask.projectId._id);
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to delete link' });
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !subtaskTitle.trim()) return;
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subtaskTitle,
          status: 'to_do',
          priority: subtaskPriority,
          taskType: 'subtask',
          parentId: selectedTask._id,
          projectId: selectedTask.projectId?._id,
          assignedTo: subtaskAssignee || undefined,
          assignedBy: user?.id,
          companyId: user?.companyId,
        }),
      });
      if (response.ok) {
        addToast({ type: 'success', title: 'Subtask created', description: 'Subtask added successfully.' });
        setSubtaskTitle('');
        setSubtaskAssignee('');
        setSubtaskPriority('medium');
        setShowAddSubtaskForm(false);
        fetchSubtasks(selectedTask._id);
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to create subtask' });
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      
      const response = await fetch(`/api/tasks?${params.toString()}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load tasks" });
    } finally {
      setLoading(false);
    }
  };

  const fetchBacklogTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      
      const response = await fetch(`/api/backlog?${params.toString()}`);
      const data = await response.json();
      setBacklogTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch backlog tasks:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load backlog tasks" });
    }
  };

  const handleStatusUpdate = async (taskId: string, status: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task status updated" });
        fetchTasks();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update task status" });
    }
  };

  const handleDragStart = (task: TaskItem) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== status) {
      // Check WIP limit
      const column = projectBoard?.columns?.find((col: any) => col.status === status);
      const tasksInColumn = filteredTasks.filter(t => t.status === status).length;
      
      if (column?.wipLimit && tasksInColumn >= column.wipLimit) {
        addToast({ 
          type: "error", 
          title: "WIP Limit Reached", 
          description: `Cannot move task. ${column.name} has reached its WIP limit of ${column.wipLimit}.` 
        });
        setDraggedTask(null);
        return;
      }
      
      await handleStatusUpdate(draggedTask._id, status);
    }
    setDraggedTask(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task deleted" });
        fetchTasks();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete task" });
    }
  };

  const handleCreateTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          taskType: formData.taskType,
          projectId: formData.projectId,
          assignedTo: formData.assignedTo || undefined,
          assignedBy: formData.assignedBy || user?.id,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
          storyPoints: formData.storyPoints ? parseFloat(formData.storyPoints) : undefined,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
          actualHours: formData.actualHours ? parseFloat(formData.actualHours) : undefined,
          parentId: formData.parentId || undefined,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task created" });
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          status: 'to_do',
          priority: 'medium',
          taskType: 'task',
          projectId: '',
          assignedTo: '',
          assignedBy: '',
          dueDate: '',
          startDate: '',
          storyPoints: '',
          estimatedHours: '',
          actualHours: '',
          parentId: '',
          tags: '',
          linkedItems: '',
          initialComment: '',
        });
        fetchTasks();
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to create task" });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-gray-600">Manage project tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              List
            </Button>
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="rounded-l-none"
            >
              <KanbanSquare className="w-4 h-4 mr-2" />
              Board
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBacklogModal(true)}
          >
            <KanbanSquare className="w-4 h-4 mr-2" />
            Backlog
          </Button>
          <Button onClick={() => handleOpenCreateModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks View */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No tasks found
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
            <Card key={task._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      {task.taskType && (
                        <Badge className={`${taskTypeColors[task.taskType] || taskTypeColors.task} text-xs`} variant="outline">
                          {taskTypeLabels[task.taskType] || taskTypeLabels.task}
                        </Badge>
                      )}
                      <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.taskNumber}</p>
                    <p className="text-gray-700 mb-3">{task.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <KanbanSquare className="w-4 h-4" />
                        <span>{task.projectId?.name || 'Unknown Project'}</span>
                      </div>
                      {task.assignedTo && (
                        <button
                          onClick={() => handleInsertMentionFromBadge(task.assignedTo.name)}
                          className="flex items-center gap-2 hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                          title="Click to mention in comment"
                        >
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">Assigned: {task.assignedTo.name}</span>
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}</span>
                      </div>
                      {task.estimatedHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{task.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${task.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(task)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {['backlog', 'to_do', 'in_progress', 'in_review'].includes(task.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(task._id, 'completed')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      ) : (
        /* Board View */
        <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-thin">
          {Object.entries(boardStatusLabels).map(([status, label]) => {
            const theme = statusThemes[status] || statusThemes.backlog;
            const columnTasks = filteredTasks.filter(t => t.status === status);
            const taskCount = columnTasks.length;
            const column = projectBoard?.columns?.find((col: any) => col.status === status);
            const wipLimit = column?.wipLimit;
            const isOverWip = wipLimit ? taskCount > wipLimit : false;

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex-shrink-0 w-80 rounded-2xl border p-4 transition-all duration-200 flex flex-col space-y-4 ${
                  dragOverColumn === status 
                    ? 'border-indigo-500 bg-indigo-50/30 shadow-[inset_0_2px_8px_rgba(99,102,241,0.05)]' 
                    : isOverWip
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200/60 bg-slate-50/40'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} shrink-0`} />
                    <h3 className="font-bold text-sm text-slate-800 truncate">{label}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenCreateModal(status)}
                      className="w-5 h-5 rounded-md hover:bg-slate-200/80 border border-transparent hover:border-slate-300/40 flex items-center justify-center text-slate-500 hover:text-indigo-650 transition-all"
                      title={`Create task in ${label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {wipLimit ? (
                      <Badge 
                        variant={taskCount >= wipLimit ? "destructive" : "outline"}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          taskCount >= wipLimit 
                            ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' 
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        WIP: {taskCount}/{wipLimit}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border-slate-200 text-slate-500">
                        {taskCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 min-h-[350px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {taskCount === 0 ? (
                    <button
                      onClick={() => handleOpenCreateModal(status)}
                      className="w-full border border-dashed border-slate-250/80 rounded-xl p-8 text-center bg-white/40 flex flex-col items-center justify-center space-y-2 hover:bg-white hover:border-slate-350 transition-all duration-200 group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.lightBg} text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all`}>
                        <Plus className="w-4 h-4 text-slate-550" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-650 transition-colors">Create task</p>
                    </button>
                  ) : (
                    <>
                      {columnTasks.map((task) => (
                        <Card
                          key={task._id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          className="cursor-grab active:cursor-grabbing hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 hover:border-slate-350 rounded-xl bg-white transition-all duration-200 select-none group"
                        >
                          <CardContent className="p-3.5 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                  {task.taskNumber}
                                </span>
                                <span className="text-[10px] font-semibold text-indigo-650 truncate">
                                  {task.projectId?.name || 'Unknown'}
                                </span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3.5 h-3.5 text-slate-350" />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {task.taskType && (
                                  <Badge className={`${taskTypeColors[task.taskType] || taskTypeColors.task} text-[9px] font-bold px-2 py-0.5 rounded`} variant="outline">
                                    {taskTypeLabels[task.taskType] || taskTypeLabels.task}
                                  </Badge>
                                )}
                                <Badge className={`${priorityColors[task.priority]} text-[9px] font-bold px-2 py-0.5 rounded`} variant="outline">
                                  {priorityLabels[task.priority]}
                                </Badge>
                              </div>
                              <h4 className="font-bold text-slate-800 text-xs line-clamp-2 leading-relaxed group-hover:text-indigo-650 transition-colors">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Mini Progress Bar */}
                            {(task.progressPercentage || 0) > 0 && (
                              <div className="space-y-1 pt-0.5">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                  <span>Progress</span>
                                  <span>{task.progressPercentage || 0}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                  <div className="h-1 bg-indigo-600 rounded-full" style={{ width: `${task.progressPercentage || 0}%` }} />
                                </div>
                              </div>
                            )}

                            <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`${priorityColors[task.priority]} text-[9px] font-semibold px-2 py-0.5 rounded-full`} variant="outline">
                                  {priorityLabels[task.priority]}
                                </Badge>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(task);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded"
                                >
                                  <Edit className="w-3 h-3 text-slate-400" />
                                </button>
                                {task.assignedTo ? (
                                  <div className="flex items-center gap-1.5">
                                    {(() => {
                                      const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                      const initials = getInitials(task.assignedTo.name);
                                      const colors = [
                                        'bg-indigo-50 text-indigo-700 border-indigo-150',
                                        'bg-emerald-50 text-emerald-700 border-emerald-150',
                                        'bg-sky-50 text-sky-700 border-sky-150',
                                        'bg-amber-50 text-amber-700 border-amber-150',
                                        'bg-rose-50 text-rose-700 border-rose-150'
                                      ];
                                      let hash = 0;
                                      for (let i = 0; i < task.assignedTo.name.length; i++) {
                                        hash = task.assignedTo.name.charCodeAt(i) + ((hash << 5) - hash);
                                      }
                                      const color = colors[Math.abs(hash) % colors.length];
                                      return (
                                        <div 
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${color}`}
                                          title={task.assignedTo.name}
                                        >
                                          {initials}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-50 border border-dashed border-slate-250 flex items-center justify-center text-slate-400 shrink-0" title="Unassigned">
                                    <User className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <button
                        onClick={() => handleOpenCreateModal(status)}
                        className="w-full border border-dashed border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-xl py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-650 transition-all bg-white/40 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal - Comprehensive Jira Style */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Create Issue</h2>
                <p className="text-[10px] text-slate-400 font-medium">Create a new task or issue</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Left Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Summary *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-base font-bold text-slate-800 transition-all"
                    placeholder="Task title"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs text-slate-800 transition-all resize-none min-h-[120px]"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Linked Items input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tags (Labels)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs text-slate-800 transition-all"
                    placeholder="Labels separated by comma (e.g., frontend, bug)"
                  />
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="w-80 border-l p-6 bg-slate-50/50 overflow-y-auto space-y-5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Details</h3>
                
                <div className="space-y-4 text-xs">
                  {/* Project */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project *</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Issue Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Issue type</label>
                    <select
                      value={formData.taskType}
                      onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="task">Task</option>
                      <option value="story">Story</option>
                      <option value="bug">Bug</option>
                      <option value="epic">Epic</option>
                      <option value="subtask">Subtask</option>
                      <option value="improvement">Improvement</option>
                    </select>
                  </div>

                  {/* Parent Task Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Task</label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                      disabled={!formData.projectId}
                    >
                      <option value="">None</option>
                      {tasks
                        .filter(t => t.projectId?._id === formData.projectId && t.taskType !== 'subtask')
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.taskNumber} - {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      {Object.entries(boardStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assignee</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Story Points */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Story Points</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.storyPoints}
                      onChange={(e) => setFormData({ ...formData, storyPoints: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                      placeholder="e.g., 5"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                    />
                  </div>

                  {/* Reporter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporter</label>
                    <select
                      value={formData.assignedBy}
                      onChange={(e) => setFormData({ ...formData, assignedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">Auto (Current User)</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated vs Actual Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimate (Hrs)</label>
                      <input
                        type="number"
                        value={formData.estimatedHours}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                        placeholder="Hrs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actual (Hrs)</label>
                      <input
                        type="number"
                        value={formData.actualHours}
                        onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                        placeholder="Hrs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                  <Button 
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTask}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    disabled={!formData.projectId || !formData.title}
                  >
                    Create Issue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal - Comprehensive Jira Style */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {selectedTask.taskNumber}
                </span>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer transition-all"
                >
                  <option value="backlog">Backlog</option>
                  <option value="to_do">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Left Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Summary *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-base font-bold text-slate-800 transition-all"
                    placeholder="Task title"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs text-slate-800 transition-all resize-none min-h-[120px]"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Subtasks */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CornerDownRight className="w-4 h-4 text-indigo-500" />
                      Subtasks ({subtasks.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddSubtaskForm(!showAddSubtaskForm)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add subtask
                    </button>
                  </div>

                  {showAddSubtaskForm && (
                    <form onSubmit={handleCreateSubtask} className="mb-4 p-3.5 border border-indigo-100 rounded-xl bg-indigo-50/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={subtaskTitle}
                          onChange={(e) => setSubtaskTitle(e.target.value)}
                          placeholder="What needs to be done?"
                          className="md:col-span-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white"
                        />
                        <select
                          value={subtaskAssignee}
                          onChange={(e) => setSubtaskAssignee(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                        >
                          <option value="">Assignee</option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                          ))}
                        </select>
                        <select
                          value={subtaskPriority}
                          onChange={(e) => setSubtaskPriority(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="critical">Critical Priority</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddSubtaskForm(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" type="submit">
                          Add Subtask
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {subtasks.length > 0 ? (
                      subtasks.map((sub, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 border border-slate-100 hover:border-slate-200 rounded-xl bg-white transition-all">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded">
                              {sub.taskNumber}
                            </span>
                            <span className="text-xs font-medium text-slate-800">{sub.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              sub.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {sub.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-semibold text-slate-505">
                              {sub.assignedTo?.name || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-xl">No subtasks yet</p>
                    )}
                  </div>
                </div>

                {/* Linked Work Items */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Link2 className="w-4 h-4 text-indigo-500" />
                    Linked Issues
                  </h4>

                  {/* Add Link Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-white border border-slate-100 rounded-xl">
                    <select
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value as any)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                    >
                      <option value="dependsOn">is blocked by</option>
                      <option value="blocks">blocks</option>
                    </select>

                    <select
                      value={linkTaskId}
                      onChange={(e) => setLinkTaskId(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                    >
                      <option value="">Select issue to link...</option>
                      {projectTasks
                        .filter(t => t._id !== selectedTask._id)
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.taskNumber} - {t.title} ({t.status.replace('_', ' ')})
                          </option>
                        ))}
                    </select>

                    <Button type="button" size="sm" onClick={handleAddLink} disabled={!linkTaskId}>
                      Link Issue
                    </Button>
                  </div>

                  {/* Links List */}
                  <div className="space-y-2">
                    {/* Depends On links */}
                    {selectedTask.dependsOn && selectedTask.dependsOn.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">is blocked by</p>
                        {selectedTask.dependsOn.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                            <span className="text-xs font-medium text-slate-800">
                              <span className="font-mono font-bold text-indigo-600 mr-2">{item.taskNumber}</span>
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600">
                                {item.status.replace('_', ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(item._id, 'dependsOn')}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Blocks links */}
                    {selectedTask.blocks && selectedTask.blocks.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">blocks</p>
                        {selectedTask.blocks.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                            <span className="text-xs font-medium text-slate-800">
                              <span className="font-mono font-bold text-indigo-600 mr-2">{item.taskNumber}</span>
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600">
                                {item.status.replace('_', ' ')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(item._id, 'blocks')}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!selectedTask.dependsOn || selectedTask.dependsOn.length === 0) &&
                     (!selectedTask.blocks || selectedTask.blocks.length === 0) && (
                      <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-xl">No linked issues yet</p>
                    )}
                  </div>
                </div>

                {/* Activity Section */}
                <div>
                  <div className="border-b border-slate-200 mb-4">
                    <div className="flex gap-6">
                      {['comments', 'history'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActivityTab(tab as any)}
                          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                            activityTab === tab
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activityTab === 'comments' && (
                    <div className="space-y-4">
                      {/* Comments List */}
                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {selectedTask.comments && selectedTask.comments.length > 0 ? (
                          selectedTask.comments.map((comment: any, idx: number) => (
                            <div key={idx} className="flex gap-3 bg-slate-50/30 border border-slate-100/50 p-3 rounded-2xl">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                {comment.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div>
                                    <span className="font-bold text-xs text-slate-800 mr-2">{comment.userName}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                  </div>
                                  {(comment.userId === user?.id || (user as any)?._id === comment.userId || ['admin', 'hr', 'manager'].includes(user?.role || '')) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment._id)}
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      title="Delete comment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">{comment.text}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl">No comments yet</p>
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="mt-4 border-t pt-4 space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          {['Looks good!', 'Need help?', 'This is blocked...', 'Can you clarify...?'].map((quickText) => (
                            <button
                              key={quickText}
                              type="button"
                              onClick={() => setNewComment(quickText)}
                              className="text-[10px] font-semibold px-2.5 py-1 bg-slate-50 border hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            >
                              {quickText}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          {showMentionList && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1.5 text-xs z-50">
                              <div className="p-1 pb-1.5 mb-1 border-b border-slate-100 flex items-center gap-1.5">
                                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Search members..."
                                  value={mentionQuery}
                                  onChange={(e) => setMentionQuery(e.target.value)}
                                  className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                />
                              </div>
                              {filteredMentionMembers.length > 0 ? (
                                <div className="space-y-0.5">
                                  {filteredMentionMembers.map((m: any) => (
                                    <button
                                      key={m._id}
                                      type="button"
                                      onClick={() => handleSelectMention(m.name)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50/80 rounded-lg flex items-center justify-between transition-colors"
                                    >
                                      <span className="font-semibold text-slate-800">@{m.name}</span>
                                      {m.email && <span className="text-[10px] text-slate-400 font-medium">{m.email}</span>}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-2 py-2 text-[11px] text-slate-400 italic text-center">No matching members</div>
                              )}
                            </div>
                          )}
                          <textarea
                            value={newComment}
                            onChange={handleCommentChange}
                            placeholder="Add a comment... (Type @ to mention members)"
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs transition-all resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" type="button" onClick={handleAddComment} disabled={!newComment.trim()}>
                            Save Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activityTab === 'history' && (
                    <div className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed">
                      History log coming soon...
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="w-80 border-l p-6 bg-slate-50/50 overflow-y-auto space-y-5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Details</h3>
                
                <div className="space-y-4 text-xs">
                  {/* Project selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project *</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Issue Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Issue type</label>
                    <select
                      value={formData.taskType}
                      onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="task">Task</option>
                      <option value="story">Story</option>
                      <option value="bug">Bug</option>
                      <option value="epic">Epic</option>
                      <option value="subtask">Subtask</option>
                      <option value="improvement">Improvement</option>
                    </select>
                  </div>

                  {/* Parent Task Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Task</label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">None</option>
                      {projectTasks
                        .filter(t => t._id !== selectedTask._id && t.taskType !== 'subtask')
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.taskNumber} - {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assignee</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Story Points */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Story Points</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.storyPoints}
                      onChange={(e) => setFormData({ ...formData, storyPoints: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                      placeholder="e.g., 5"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                    />
                  </div>

                  {/* Estimated vs Actual Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimate (Hrs)</label>
                      <input
                        type="number"
                        value={formData.estimatedHours}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                        placeholder="Hrs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actual (Hrs)</label>
                      <input
                        type="number"
                        value={formData.actualHours}
                        onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800"
                        placeholder="Hrs"
                      />
                    </div>
                  </div>
                  
                  {/* Creator */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reporter</label>
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                        {selectedTask.createdBy?.name?.charAt(0).toUpperCase() || 'R'}
                      </div>
                      <span className="font-bold text-slate-700">{selectedTask.createdBy?.name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                  <Button 
                    variant="ghost"
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateTask}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Task Modal - Jira Style */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {selectedTask.taskNumber}
                </span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusUpdate(selectedTask._id, e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Left Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedTask.title}</h1>
                
                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description || 'No description provided'}</p>
                  </div>
                </div>

                {/* Subtasks */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Subtasks</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">No subtasks yet</p>
                  </div>
                </div>

                {/* Linked Work Items */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Linked Work Items</h3>
                  {selectedTask.dependsOn && selectedTask.dependsOn.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTask.dependsOn.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="text-xs font-mono text-blue-600">{item.taskNumber}</span>
                          <span className="text-sm text-gray-700">{item.title}</span>
                          <Badge className={statusColors[item.status]} variant="outline">{statusLabels[item.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm">No linked work items</p>
                    </div>
                  )}
                </div>

                {/* Activity Section */}
                <div className="mb-6">
                  <div className="border-b mb-4">
                    <div className="flex gap-6">
                      {['all', 'comments', 'history'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActivityTab(tab as any)}
                          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                            activityTab === tab
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-4">
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      selectedTask.comments.map((comment, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                            {comment.userName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No activity yet</p>
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="mt-6 border-t pt-4">
                    <div className="flex gap-2 mb-2">
                      {['Looks good!', 'Need help?', 'This is blocked...', 'Can you clarify...?'].map((quickText) => (
                        <button
                          key={quickText}
                          onClick={() => setNewComment(quickText)}
                          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {quickText}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={() => setNewComment('')}>
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="w-80 border-l p-6 bg-gray-50 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                
                <div className="space-y-4">
                  {/* Assignee */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Assignee</label>
                    {selectedTask.assignedTo ? (
                      <button
                        onClick={() => handleInsertMentionFromBadge(selectedTask.assignedTo.name)}
                        className="flex items-center gap-2 mt-1 hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                        title="Click to mention in comment"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {selectedTask.assignedTo.name.charAt(0)}
                        </div>
                        <span className="text-sm text-blue-600 font-medium">{selectedTask.assignedTo.name}</span>
                      </button>
                    ) : (
                      <div className="mt-1">
                        <span className="text-sm text-gray-500">Unassigned</span>
                        <button className="text-xs text-blue-600 hover:underline ml-2">Assign to me</button>
                      </div>
                    )}
                  </div>

                  {/* Parent */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Parent</label>
                    <p className="text-sm text-gray-500 mt-1">None</p>
                  </div>

                  {/* Labels */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Labels</label>
                    {selectedTask.tags && selectedTask.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTask.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">None</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Due date</label>
                    <p className="text-sm text-gray-700 mt-1">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None'}
                    </p>
                  </div>

                  {/* Team */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Team</label>
                    <p className="text-sm text-gray-500 mt-1">None</p>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Start date</label>
                    <p className="text-sm text-gray-700 mt-1">
                      {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : 'None'}
                    </p>
                  </div>

                  {/* Reporter */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Reporter</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-semibold">
                        {selectedTask.createdBy?.name?.charAt(0).toUpperCase() || 'R'}
                      </div>
                      <span className="text-sm">{selectedTask.createdBy?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Priority</label>
                    <Badge className={`${priorityColors[selectedTask.priority]} mt-1`} variant="outline">
                      {priorityLabels[selectedTask.priority]}
                    </Badge>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Project</label>
                    <p className="text-sm text-gray-700 mt-1">{selectedTask.projectId?.name || 'Unknown Project'}</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Progress</label>
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${selectedTask.progressPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{selectedTask.progressPercentage}%</p>
                    </div>
                  </div>
                </div>

                {/* Development Section */}
                <div className="mt-6 pt-6 border-t">
                  <button className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full">
                    <ChevronDown className="w-4 h-4" />
                    Development
                  </button>
                </div>

                {/* Automation Section */}
                <div className="mt-4">
                  <button className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full">
                    <ChevronDown className="w-4 h-4" />
                    Automation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backlog Modal */}
      {showBacklogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in scale-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
                  <KanbanSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Backlog</h2>
                  <p className="text-sm text-slate-500">Manage your pending tasks</p>
                </div>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                  {backlogTasks.length} tasks
                </Badge>
              </div>
              <button 
                onClick={() => setShowBacklogModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-all w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="mb-6 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search backlog tasks..."
                    value={backlogSearchQuery}
                    onChange={(e) => setBacklogSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                  />
                </div>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all min-w-[140px]"
                >
                  <option value="">All Priority</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Button 
                  onClick={() => handleOpenCreateModal('backlog')}
                  className="px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Backlog
                </Button>
              </div>

              <div className="space-y-4">
                {backlogTasks.filter(task => 
                  task.title.toLowerCase().includes(backlogSearchQuery.toLowerCase()) ||
                  task.taskNumber.toLowerCase().includes(backlogSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <KanbanSquare className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-lg font-semibold text-slate-700 mb-2">No tasks in backlog</p>
                    <p className="text-sm text-slate-500 mb-4">Click "Add to Backlog" to create your first task</p>
                    <Button 
                      onClick={() => handleOpenCreateModal('backlog')}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Task
                    </Button>
                  </div>
                ) : (
                  backlogTasks.filter(task => 
                    task.title.toLowerCase().includes(backlogSearchQuery.toLowerCase()) ||
                    task.taskNumber.toLowerCase().includes(backlogSearchQuery.toLowerCase())
                  ).map((task) => (
                    <Card
                      key={task._id}
                      className="hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-slate-200 rounded-2xl bg-white"
                      onClick={() => handleOpenEditModal(task)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                                {task.taskNumber}
                              </span>
                              {task.taskType && (
                                <Badge className={`${taskTypeColors[task.taskType] || taskTypeColors.task} text-xs px-3 py-1 rounded-lg`} variant="outline">
                                  {taskTypeLabels[task.taskType] || taskTypeLabels.task}
                                </Badge>
                              )}
                              <Badge className={`${priorityColors[task.priority]} text-xs px-3 py-1 rounded-lg`}>
                                {priorityLabels[task.priority]}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2 text-base">{task.title}</h3>
                            <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                  <KanbanSquare className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium">{task.projectId?.name || 'Unknown'}</span>
                                </div>
                                {task.assignedTo && (
                                  <button
                                    onClick={() => handleInsertMentionFromBadge(task.assignedTo.name)}
                                    className="flex items-center gap-2 hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                                    title="Click to mention in comment"
                                  >
                                    <User className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-blue-600">{task.assignedTo.name}</span>
                                  </button>
                              )}
                              {task.estimatedHours && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{task.estimatedHours}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(task);
                              }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(task._id, 'to_do');
                              }}
                              title="Move to To Do"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task._id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
