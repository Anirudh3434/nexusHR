"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Calendar } from "@/components/ui/Calendar";
import { format } from "date-fns";
import { 
  KanbanSquare, Plus, Settings, GripVertical, User, Clock, 
  ArrowLeft, MoreHorizontal, Filter, Search, CheckCircle, Trash2, Edit,
  List, LayoutList, FileText, Calendar as CalendarIcon, X, Link2, CornerDownRight, MessageSquare, AlertTriangle, CheckSquare, BookOpen, Bug, Zap, Layers, TrendingUp, AlertCircle, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown, ExternalLink, Check, Save, ArrowRight, Paperclip, Loader2, Vault, Sparkles, Send, Copy
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import TransitionErrorPopup from "@/components/projects/TransitionErrorPopup";

interface TaskItem {
  _id: string;
  taskNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  taskType?: string;
  projectId: { _id: string; name: string; projectNumber: string };
  assignedTo?: Array<{ _id: string; name: string }>;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  progressPercentage: number;
  parentId?: { _id: string; taskNumber: string; title: string; status: string } | string;
  dependsOn?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  blocks?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  relatesTo?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  duplicates?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  isDuplicatedBy?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  comments?: Array<{ _id: string; userId: string; userName: string; text: string; createdAt: string }>;
  createdBy?: { _id: string; name: string };
  sprintId?: { _id: string; sprintNumber: string; name: string } | string;
  labels?: Array<{ _id: string; name: string; color: string }>;
  attachments?: Array<{ name: string; url: string }>;
  customStatus?: { id: string; name: string; color?: string };
}

interface Project {
  _id: string;
  name: string;
  projectNumber: string;
  description: string;
  status: string;
  priority: string;
  board?: {
    type: string;
    columns: Array<{
      id: string;
      name: string;
      status: string;
      color: string;
      wipLimit?: number;
      allowedTransitions?: string[];
      customStatuses?: Array<{
        id: string;
        name: string;
        color?: string;
        position: number;
      }>;
    }>;
  };
  useSprints: boolean;
  managerId?: { _id: string; name: string; email: string; avatar?: string };
  members?: Array<{ employeeId: { _id: string; name: string; email: string; avatar?: string }; role: string }>;
  githubRepo?: string;
}

const getInitials = (name: string) => name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
const getAvatarColor = (index: number) => {
  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500'];
  return colors[index % colors.length];
};

export default function ProjectBoardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai', text: string, timestamp: Date }>>([
    { sender: 'ai', text: 'Hi! I am **NexusAI**, your agentic assistant. I can answer questions about your tasks or execute operations directly! Try commands like:\n- *\"Move TSK26070010 to in progress\"*\n- *\"Assign TSK26070012 to Tarun\"*\n- *\"Comment on TSK26070011 saying: looks good\"*', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState("");
  const [isConnectingRepo, setIsConnectingRepo] = useState(false);
  const [draggedTask, setDraggedTask] = useState<TaskItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [selectedTaskForCustomStatus, setSelectedTaskForCustomStatus] = useState<TaskItem | null>(null);
  const [targetColumnForCustomStatus, setTargetColumnForCustomStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [createStatus, setCreateStatus] = useState<string>("to_do");
  const viewMode = (params.view as 'board' | 'list' | 'backlog' | 'timeline' | 'docs' | 'rules' | 'ai-chat') || 'board';

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    taskType: [] as string[],
    status: [] as string[],
    priority: [] as string[],
    assignee: [] as string[],
    dueDate: '' as string,
    storyPoints: '' as string,
    labels: [] as string[],
    epic: [] as string[],
  });

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeFilterDropdown && event.target instanceof Element) {
        const dropdown = event.target.closest('[data-filter-dropdown]');
        if (!dropdown) {
          setActiveFilterDropdown(null);
          setFilterSearchQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeFilterDropdown]);

  // Labels state
  const [availableLabels, setAvailableLabels] = useState<Array<{ _id: string; name: string; color: string }>>([]);
  const [selectedLabels, setSelectedLabels] = useState<Array<{ _id: string; name: string; color: string }>>([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showCustomLabelForm, setShowCustomLabelForm] = useState(false);
  const [customLabelName, setCustomLabelName] = useState('');
  const [customLabelColor, setCustomLabelColor] = useState('#3b82f6');
  // Auto Comment Automation state
  const [showAutoCommentModal, setShowAutoCommentModal] = useState(false);
  const [autoRules, setAutoRules] = useState<any[]>([]);
  const [autoRuleForm, setAutoRuleForm] = useState({
    fromStatus: 'any',
    toStatus: 'any',
    template: 'Moved {{task_number}} from {{from_status}} to {{to_status}}. Assigned to @{{assignee}}'
  });

  const fetchAutoCommentRules = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/project-auto-comments?projectId=${projectId}`);
      const data = await res.json();
      setAutoRules(data.rules || []);
    } catch (err) {
      console.error('Error fetching auto comment rules:', err);
    }
  };

  const handleOpenAutoCommentModal = () => {
    fetchAutoCommentRules();
    setShowAutoCommentModal(true);
  };

  const handleSaveAutoCommentRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoRuleForm.template.trim()) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;
      if (user?.name) headers['x-user-name'] = user.name;
      if (user?.companyId) headers['x-company-id'] = user.companyId;

      const res = await fetch('/api/project-auto-comments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          fromStatus: autoRuleForm.fromStatus,
          toStatus: autoRuleForm.toStatus,
          template: autoRuleForm.template
        })
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Automation Rule Saved', description: 'Rule will trigger when ticket status changes.' });
        fetchAutoCommentRules();
      } else {
        const errorData = await res.json();
        addToast({ type: 'error', title: 'Error', description: errorData.message || 'Failed to save rule' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to save rule' });
    }
  };

  const handleDeleteAutoRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/project-auto-comments?projectId=${projectId}&ruleId=${ruleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Rule Deleted', description: 'Automation rule removed.' });
        fetchAutoCommentRules();
      }
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to delete rule' });
    }
  };

  // Label search query
  const [labelSearchQuery, setLabelSearchQuery] = useState('');

  // Extract project labels from existing tasks
  const projectLabels = useMemo(() => {
    const labelMap = new Map<string, { _id: string; name: string; color: string }>();
    [...tasks, ...backlogTasks].forEach(task => {
      if (task.labels) {
        task.labels.forEach((label: any) => {
          if (!labelMap.has(label._id)) {
            labelMap.set(label._id, { _id: label._id, name: label.name, color: label.color });
          }
        });
      }
    });
    return Array.from(labelMap.values());
  }, [tasks, backlogTasks]);

  // Combined labels (project labels + custom labels)
  const allLabels = useMemo(() => {
    const combined = [...projectLabels];
    availableLabels.forEach(label => {
      if (!combined.find(l => l._id === label._id)) {
        combined.push(label);
      }
    });
    return combined;
  }, [projectLabels, availableLabels]);

  // Filtered labels based on search
  const filteredLabels = useMemo(() => {
    if (!labelSearchQuery) return allLabels;
    return allLabels.filter(label =>
      label.name.toLowerCase().includes(labelSearchQuery.toLowerCase())
    );
  }, [allLabels, labelSearchQuery]);

  // Add custom label
  const handleAddCustomLabel = (labelName?: string) => {
    const nameToUse = labelName || customLabelName.trim();
    if (!nameToUse) return;
    // Auto-assign color from preset
    const colorPalette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const newLabel = {
      _id: "cs_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      name: nameToUse,
      color: randomColor,
    };
    setAvailableLabels(prev => [...prev, newLabel]);
    setCustomLabelName('');
    setCustomLabelColor('#3b82f6');
    setShowCustomLabelForm(false);
    return newLabel;
  };

  // Delete custom label
  const handleDeleteLabel = (labelId: string) => {
    setAvailableLabels(prev => prev.filter(l => l._id !== labelId));
    setSelectedLabels(prev => prev.filter(l => l._id !== labelId));
  };
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'to_do',
    priority: 'medium',
    taskType: 'task',
    assignedTo: [] as string[],
    dueDate: '',
    startDate: '',
    storyPoints: '',
    estimatedHours: '',
    actualHours: '',
    parentId: '',
    linkedItems: '',
    customStatus: null as any,
    sprintId: '' as string,
  });

  const [taskAttachments, setTaskAttachments] = useState<Array<{ name: string; url: string }>>([]);
  const [commentAttachments, setCommentAttachments] = useState<Array<{ name: string; url: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string } | null>(null);

  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('comments');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const projectMembersList = useMemo(() => {
    const list: Array<{ _id: string; name: string; email?: string }> = [];
    if (project?.managerId) {
      list.push({ _id: project.managerId._id, name: project.managerId.name, email: project.managerId.email });
    }
    project?.members?.forEach((m: any) => {
      if (m.employeeId && !list.some(x => x._id === m.employeeId._id)) {
        list.push({ _id: m.employeeId._id, name: m.employeeId.name, email: m.employeeId.email });
      }
    });
    return list;
  }, [project]);

  const filteredMentionMembers = useMemo(() => {
    if (!mentionQuery) return projectMembersList;
    const q = mentionQuery.toLowerCase();
    return projectMembersList.filter(m => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)));
  }, [projectMembersList, mentionQuery]);

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

  const renderCommentText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-700 font-semibold border border-indigo-200/60 mx-0.5 text-[11px]">
            {part}
          </span>
        );
      }
      return part;
    });
  };
  const [linkTaskId, setLinkTaskId] = useState('');
  const [linkType, setLinkType] = useState<'blocks' | 'dependsOn' | 'relatesTo' | 'duplicates' | 'isDuplicatedBy'>('dependsOn');
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('medium');
  const [showAddSubtaskForm, setShowAddSubtaskForm] = useState(false);
  const [createTaskType, setCreateTaskType] = useState('task');
  const [createTaskPriority, setCreateTaskPriority] = useState('medium');
  const [createTaskAssignees, setCreateTaskAssignees] = useState<string[]>([]);
  const [createTaskParentId, setCreateTaskParentId] = useState('');

  // Backlog multi-select
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const toggleBacklogSelect = (id: string) =>
    setSelectedBacklogIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleBulkUpdate = async (patch: Record<string, any>) => {
    if (!selectedBacklogIds.size) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        [...selectedBacklogIds].map(taskId =>
          fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, ...patch }),
          })
        )
      );
      addToast({ type: 'success', title: 'Updated', description: `${selectedBacklogIds.size} task(s) updated` });
      setSelectedBacklogIds(new Set());
      fetchBacklogTasks();
      fetchTasks();
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Bulk update failed' });
    } finally {
      setBulkUpdating(false);
    }
  };

  // Sprint state
  const [sprints, setSprints] = useState<any[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [sprintCalendarOpen, setSprintCalendarOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({ count: 1, startDate: '', durationWeeks: '2' });
  const [creatingSprintLoading, setCreatingSprintLoading] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editingSprintName, setEditingSprintName] = useState('');
  const [editingSprintLoading, setEditingSprintLoading] = useState(false);
  const [showSprintMoveAlert, setShowSprintMoveAlert] = useState(false);
  const [previousSprintTasks, setPreviousSprintTasks] = useState<TaskItem[]>([]);

  const fetchSprints = useCallback(async () => {
    if (!projectId || !user?.companyId) return;
    try {
      const res = await fetch(`/api/sprints?companyId=${user.companyId}&projectId=${projectId}`);
      const data = await res.json();
      setSprints(data.sprints || []);

      // Auto-select current sprint based on date
      const now = new Date();
      const currentSprint = data.sprints?.find((sprint: any) => {
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        return now >= start && now <= end;
      });

      // Always auto-select current sprint if found
      if (currentSprint) {
        setSelectedSprintId(currentSprint._id);
      }
    } catch { /* silent */ }
  }, [projectId, user?.companyId]);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (data.project) {
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  }, [projectId]);

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('searchQuery', searchQuery);
    if (filters.taskType.length > 0) params.append('taskType', filters.taskType.join(','));
    if (filters.status.length > 0) params.append('status', filters.status.join(','));
    if (filters.priority.length > 0) params.append('priority', filters.priority.join(','));
    if (filters.assignee.length > 0) params.append('assignee', filters.assignee.join(','));
    if (filters.dueDate) params.append('dueDate', filters.dueDate);
    if (filters.storyPoints) params.append('storyPoints', filters.storyPoints);
    if (filters.labels.length > 0) params.append('labels', filters.labels.join(','));
    if (filters.epic.length > 0) params.append('epic', filters.epic.join(','));
    return params.toString();
  }, [searchQuery, filters]);

  const fetchTasks = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setTasksLoading(true);
      const queryStr = buildFilterQuery();
      const response = await fetch(`/api/tasks?projectId=${projectId}&${queryStr}&t=${Date.now()}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setTasksLoading(false);
    }
  }, [projectId, buildFilterQuery]);

  const fetchBacklogTasks = useCallback(async () => {
    try {
      const queryStr = buildFilterQuery();
      const response = await fetch(`/api/backlog?projectId=${projectId}&${queryStr}&t=${Date.now()}`);
      const data = await response.json();
      setBacklogTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching backlog tasks:', error);
    }
  }, [projectId, buildFilterQuery]);

  const fetchAllTasks = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setTasksLoading(true);
      const queryStr = buildFilterQuery();
      const response = await fetch(`/api/tasks?projectId=${projectId}&status=all&${queryStr}&t=${Date.now()}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
    } finally {
      setLoading(false);
      setTasksLoading(false);
    }
  }, [projectId, buildFilterQuery]);

  const fetchSubtasks = useCallback(async (parentTaskId: string) => {
    try {
      const response = await fetch(`/api/tasks?parentId=${parentTaskId}&t=${Date.now()}`);
      const data = await response.json();
      setSubtasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchVal(value);
    
    // Auto-detect AI intent: more than 3 words or contains common natural language query keywords
    const isAiIntent = value.trim().split(/\s+/).length > 3 || 
      ['to me', 'my task', 'assigned', 'deployed', 'progress', 'status', 'today', 'sprint', 'show', 'which', 'what', 'who', 'done', 'completed'].some(kw => value.toLowerCase().includes(kw));

    if (isAiIntent) {
      setAiMode(true);
    } else {
      if (aiActive) {
        setAiActive(false);
        setAiExplanation("");
      }
    }
  };

  const toggleAiMode = () => {
    setAiMode(prev => {
      const next = !prev;
      if (!next) {
        setSearchQuery(searchVal);
        if (aiActive) {
          setAiActive(false);
          setAiExplanation("");
          fetchTasks();
          fetchBacklogTasks();
        }
      }
      return next;
    });
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;

    if (aiMode) {
      setAiLoading(true);
      try {
        const res = await fetch('/api/tasks/ai-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.id || (user as any)?._id || '',
            'x-user-name': user?.name || ''
          },
          body: JSON.stringify({ projectId, prompt: searchVal })
        });
        const data = await res.json();
        if (res.ok) {
          setTasks(data.tasks || []);
          setAiActive(true);
          setAiExplanation(data.explanation || "Query applied successfully");
        } else {
          addToast({ type: 'error', title: 'AI Query Failed', description: data.message || 'Error executing query' });
        }
      } catch (err) {
        console.error('AI query error:', err);
        addToast({ type: 'error', title: 'Error', description: 'Network error calling AI service' });
      } finally {
        setAiLoading(false);
      }
    } else {
      setSearchQuery(searchVal);
    }
  };

  const handleClearSearch = () => {
    setSearchVal("");
    setSearchQuery("");
    setAiActive(false);
    setAiExplanation("");
    setAiMode(false);
    fetchTasks(true);
    fetchBacklogTasks();
  };

  useEffect(() => {
    if (project?.githubRepo) {
      setGithubRepoInput(project.githubRepo);
    }
  }, [project]);

  const handleConnectGithubRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingRepo(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubRepo: githubRepoInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setProject(prev => prev ? { ...prev, githubRepo: githubRepoInput.trim() } : null);
        addToast({ type: 'success', title: 'Connected', description: 'GitHub repository successfully linked!' });
      } else {
        addToast({ type: 'error', title: 'Link Failed', description: data.message || 'Failed to link repository' });
      }
    } catch (err) {
      console.error('Error linking repo:', err);
      addToast({ type: 'error', title: 'Error', description: 'Failed to link repository due to a network error' });
    } finally {
      setIsConnectingRepo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: 'success', title: 'Copied', description: 'Response copied to clipboard' });
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMessage, timestamp: new Date() }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/tasks/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || (user as any)?._id || '',
          'x-user-name': user?.name || ''
        },
        body: JSON.stringify({
          projectId,
          prompt: userMessage,
          history: chatMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.response, timestamp: new Date() }]);
        if (data.tasks) {
          setTasks(data.tasks);
          addToast({ type: 'success', title: 'Agent Executed', description: `Successfully ran ${data.actionsExecuted || 0} operations!` });
        }
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `⚠️ **Error:** ${data.message || 'Failed to get response'}`, timestamp: new Date() }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: '⚠️ **Network Error:** Could not connect to AI service.', timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatInlineMarkdown = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pidx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pidx} className="font-bold text-indigo-700">{part.slice(2, -2)}</strong>;
      }
      const italicParts = part.split(/(\*.*?\*)/g);
      return italicParts.map((subPart, sidx) => {
        if (subPart.startsWith('*') && subPart.endsWith('*')) {
          return <em key={sidx} className="italic text-slate-800">{subPart.slice(1, -1)}</em>;
        }
        const codeParts = subPart.split(/(`.*?`)/g);
        return codeParts.map((codePart, cidx) => {
          if (codePart.startsWith('`') && codePart.endsWith('`')) {
            return <code key={cidx} className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-[10px]">{codePart.slice(1, -1)}</code>;
          }
          return codePart;
        });
      });
    });
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 my-0.5">
            {formatInlineMarkdown(line.trim().substring(2))}
          </li>
        );
      }
      if (line.includes('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (line.includes('---')) return null;
        return (
          <div key={idx} className="flex gap-2 border-b border-slate-100 py-1 font-mono text-[10px] text-slate-655">
            {cells.map((cell, cidx) => (
              <span key={cidx} className="flex-1 truncate">{cell}</span>
            ))}
          </div>
        );
      }
      return (
        <p key={idx} className="text-xs text-slate-700 leading-relaxed my-1">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Debounce searchVal when not in AI mode
  useEffect(() => {
    if (aiMode) return;
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchVal, aiMode]);

  // Initial metadata fetch on mount
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchSprints();
    }
  }, [projectId, fetchProject, fetchSprints]);

  // Refetch tasks when filters, viewMode, or project change
  useEffect(() => {
    if (projectId) {
      const showPageLoader = !initialLoaded;
      if (viewMode === 'list' || viewMode === 'ai-chat') {
        fetchAllTasks(showPageLoader).then(() => setInitialLoaded(true));
      } else if (viewMode === 'board' || viewMode === 'backlog') {
        Promise.all([
          fetchTasks(showPageLoader),
          fetchBacklogTasks()
        ]).then(() => setInitialLoaded(true));
      } else {
        setLoading(false);
        setInitialLoaded(true);
      }
    }
  }, [projectId, viewMode, searchQuery, filters, fetchTasks, fetchBacklogTasks, fetchAllTasks, initialLoaded]);

  useEffect(() => {
    if (projectId && viewMode === 'rules') {
      fetchAutoCommentRules();
    }
  }, [viewMode, projectId, fetchAutoCommentRules]);

  const handleCreateSprint = async () => {
    if (!sprintForm.startDate) return;
    setCreatingSprintLoading(true);
    try {
      const baseStart = new Date(sprintForm.startDate);
      let nextStart = new Date(baseStart);
      for (let i = 0; i < sprintForm.count; i++) {
        const start = new Date(nextStart);
        const end = new Date(start);
        end.setDate(end.getDate() + Number(sprintForm.durationWeeks) * 7);
        const res = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Sprint ${sprints.length + i + 1}`,
            projectId,
            companyId: user?.companyId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            createdBy: user?.id,
          }),
        });
        if (!res.ok) throw new Error();
        nextStart = new Date(end);
      }
      addToast({ type: 'success', title: 'Sprints created', description: `Successfully created ${sprintForm.count} sprint(s)` });
      setShowCreateSprintModal(false);
      setSprintForm({ count: 1, startDate: '', durationWeeks: '2' });
      fetchSprints();
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to create sprints' });
    } finally {
      setCreatingSprintLoading(false);
    }
  };

  const handleRenameSprint = async (sprintId: string) => {
    if (!editingSprintName.trim()) {
      setEditingSprintId(null);
      return;
    }
    setEditingSprintLoading(true);
    try {
      const res = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId, name: editingSprintName.trim() }),
      });
      if (res.ok) {
        fetchSprints();
      }
    } finally {
      setEditingSprintLoading(false);
      setEditingSprintId(null);
    }
  };

  const handleMoveToSprint = async (sprintId: string) => {
    if (!selectedBacklogIds.size) return;
    
    // Check if moving to next sprint and there are tasks in previous sprint
    const currentSprintIndex = sprints.findIndex(s => s._id === selectedSprintId);
    const targetSprintIndex = sprints.findIndex(s => s._id === sprintId);
    
    if (targetSprintIndex === currentSprintIndex + 1) {
      // Moving to next sprint
      const previousSprint = sprints[currentSprintIndex];
      const tasksInPreviousSprint = backlogTasks.filter(t => 
        ((t.sprintId as any)?._id || t.sprintId) === previousSprint._id
      );
      
      if (tasksInPreviousSprint.length > 0) {
        setPreviousSprintTasks(tasksInPreviousSprint);
        setShowSprintMoveAlert(true);
        return;
      }
    }
    
    setBulkUpdating(true);
    try {
      const taskIds = Array.from(selectedBacklogIds);
      await Promise.all(taskIds.map(taskId => {
        const task = backlogTasks.find(t => t._id === taskId);
        const currentSprintId = (task?.sprintId as any)?._id || task?.sprintId || null;
        const isMovingFromBacklog = !currentSprintId;
        
        // If moving from backlog to sprint, set status to 'to_do'
        // If moving from sprint to sprint, preserve current status
        const newStatus = isMovingFromBacklog ? 'to_do' : task?.status;
        
        return fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, sprintId, status: newStatus })
        });
      }));
      addToast({ type: 'success', title: 'Moved to sprint', description: `Moved ${taskIds.length} task(s)` });
      setSelectedBacklogIds(new Set());
      fetchBacklogTasks();
      fetchTasks();
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to move tasks' });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleMovePreviousSprintTasks = async () => {
    if (!selectedSprintId) return;
    setBulkUpdating(true);
    try {
      await Promise.all(previousSprintTasks.map(task =>
        fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task._id, sprintId: selectedSprintId, status: 'to_do' })
        })
      ));
      addToast({ type: 'success', title: 'Tasks moved', description: `Moved ${previousSprintTasks.length} task(s) to current sprint` });
      setShowSprintMoveAlert(false);
      setPreviousSprintTasks([]);
      fetchBacklogTasks();
      fetchTasks();
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to move tasks' });
    } finally {
      setBulkUpdating(false);
    }
  };

  const [dragOverSprintId, setDragOverSprintId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const handleDropTaskOnSprint = async (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    setDragOverSprintId(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = backlogTasks.find(t => t._id === taskId);
    if (!task) return;
    
    const currentSprintId = (task.sprintId as any)?._id || task.sprintId || null;
    if (currentSprintId === targetSprintId) return;

    // Determine new status based on move type
    const isMovingFromBacklog = !currentSprintId;
    const isMovingToBacklog = !targetSprintId;
    let newStatus: string;
    
    if (isMovingFromBacklog && targetSprintId) {
      // Backlog to sprint: set to 'to_do'
      newStatus = 'to_do';
    } else if (isMovingToBacklog) {
      // Sprint to backlog: set to 'backlog'
      newStatus = 'backlog';
    } else {
      // Sprint to sprint: preserve current status
      newStatus = task.status;
    }

    // Optimistic update
    setBacklogTasks(prev => prev.map(t => t._id === taskId ? { ...t, sprintId: targetSprintId as any, status: newStatus } : t));
    
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, sprintId: targetSprintId, status: newStatus })
      });
      fetchBacklogTasks();
      fetchTasks();
    } catch {
      fetchBacklogTasks();
      fetchTasks();
    }
  };

  useEffect(() => {
    if (projectId && viewMode === 'backlog') {
      fetchBacklogTasks();
      fetchSprints();
    }
  }, [viewMode, projectId, fetchBacklogTasks, fetchSprints]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      backlog: { bg: '#F3F4F6', text: '#6B7280' },
      to_do: { bg: '#DBEAFE', text: '#1D4ED8' },
      in_progress: { bg: '#FEF3C7', text: '#D97706' },
      in_review: { bg: '#E0E7FF', text: '#4F46E5' },
      completed: { bg: '#D1FAE5', text: '#059669' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626' }
    };
    return colors[status] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      backlog: 'Backlog',
      to_do: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const formatChangeValue = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'object') {
      if (value.name) return value.name;
      if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        // Handle assignee IDs by looking up names from project members
        if (fieldName === 'assignee') {
          const projectMembers: any[] = [];
          if (project?.managerId) projectMembers.push(project.managerId);
          project?.members?.forEach((m: any) => {
            if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
              projectMembers.push(m.employeeId);
            }
          });
          return value.map((v: any) => {
            const member = projectMembers.find((m: any) => m._id === v);
            return member?.name || v;
          }).join(', ');
        }
        return value.map((v: any) => v.name || v).join(', ');
      }
      return JSON.stringify(value);
    }
    
    // Format status labels
    if (fieldName === 'status') {
      const statusLabels: Record<string, string> = {
        backlog: 'Backlog',
        to_do: 'To Do',
        in_progress: 'In Progress',
        in_review: 'In Review',
        completed: 'Completed',
        cancelled: 'Cancelled'
      };
      return statusLabels[value] || value;
    }
    
    // Format priority labels
    if (fieldName === 'priority') {
      const priorityLabels: Record<string, string> = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      };
      return priorityLabels[value] || value;
    }
    
    // Handle single assignee ID
    if (fieldName === 'assignee') {
      const projectMembers: any[] = [];
      if (project?.managerId) projectMembers.push(project.managerId);
      project?.members?.forEach((m: any) => {
        if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
          projectMembers.push(m.employeeId);
        }
      });
      const member = projectMembers.find((m: any) => m._id === value);
      return member?.name || value;
    }
    
    return String(value);
  };

  const formatActivityDescription = (log: any): React.ReactNode => {
    const desc = log.description || '';

    // Format attachment additions
    if (log.actionType === 'attachment_added') {
      return (
        <span className="inline-flex items-center flex-wrap gap-1 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Attached file:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm">
            <Paperclip className="w-3 h-3 text-indigo-600 shrink-0" />
            {log.newValue}
          </span>
        </span>
      );
    }

    // Format attachment removals
    if (log.actionType === 'attachment_removed') {
      return (
        <span className="inline-flex items-center flex-wrap gap-1 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Removed file:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-400 line-through">
            <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
            {log.oldValue}
          </span>
        </span>
      );
    }

    // Format label additions
    if (log.actionType === 'label_added') {
      const renderLabels = (val: any) => {
        if (!val) return <span className="text-slate-400">None</span>;
        const items = Array.isArray(val) ? val : [val];
        return (
          <span className="inline-flex flex-wrap gap-1 items-center ml-1">
            {items.map((item, i) => {
              let name = '';
              let color = '#6B7280';
              if (typeof item === 'object' && item) {
                name = item.name || item._id || String(item);
                color = item.color || '#6B7280';
              } else {
                const found = allLabels.find(l => l._id === item);
                name = found?.name || String(item);
                color = found?.color || '#6B7280';
              }
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                    borderColor: `${color}30`
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: color }} />
                  {name}
                </span>
              );
            })}
          </span>
        );
      };
      return (
        <span className="inline-flex items-center flex-wrap gap-1 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Label added:</span>
          {renderLabels(log.newValue)}
        </span>
      );
    }

    // Format label removals
    if (log.actionType === 'label_removed') {
      const renderLabels = (val: any) => {
        if (!val) return <span className="text-slate-400">None</span>;
        const items = Array.isArray(val) ? val : [val];
        return (
          <span className="inline-flex flex-wrap gap-1 items-center ml-1">
            {items.map((item, i) => {
              let name = '';
              if (typeof item === 'object' && item) {
                name = item.name || item._id || String(item);
              } else {
                const found = allLabels.find(l => l._id === item);
                name = found?.name || String(item);
              }
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-400 line-through decoration-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full mr-1 bg-slate-350 shrink-0" />
                  {name}
                </span>
              );
            })}
          </span>
        );
      };
      return (
        <span className="inline-flex items-center flex-wrap gap-1 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Label removed:</span>
          {renderLabels(log.oldValue)}
        </span>
      );
    }

    if (!log.fieldName) return <span className="text-xs text-slate-650">{desc}</span>;
    
    // Format customStatus changes
    if (log.fieldName === 'customStatus') {
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Status:</span>
          {renderValueBadge(log.oldValue, 'customStatus')}
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          {renderValueBadge(log.newValue, 'customStatus')}
        </span>
      );
    }
    
    // Format status changes
    if (log.fieldName === 'status') {
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Status:</span>
          {renderValueBadge(log.oldValue, 'status')}
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          {renderValueBadge(log.newValue, 'status')}
        </span>
      );
    }

    // Format priority changes
    if (log.fieldName === 'priority') {
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Priority:</span>
          {renderValueBadge(log.oldValue, 'priority')}
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          {renderValueBadge(log.newValue, 'priority')}
        </span>
      );
    }

    // Format assignee changes
    if (log.fieldName === 'assignee' || log.fieldName === 'assignedTo') {
      const projectMembers: any[] = [];
      if (project?.managerId) projectMembers.push(project.managerId);
      project?.members?.forEach((m: any) => {
        if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
          projectMembers.push(m.employeeId);
        }
      });
      const getMemberName = (id: string) => {
        const m = projectMembers.find(member => member._id === id);
        return m?.name || id;
      };

      const normalizeToIds = (val: any): string[] => {
        if (!val) return [];
        const arr = Array.isArray(val) ? val : [val];
        return arr.map(x => {
          if (typeof x === 'object' && x) {
            return x._id ? String(x._id) : String(x);
          }
          return String(x);
        });
      };

      const oldIds = normalizeToIds(log.oldValue);
      const newIds = normalizeToIds(log.newValue);

      const addedIds = newIds.filter(id => !oldIds.includes(id));
      const removedIds = oldIds.filter(id => !newIds.includes(id));

      return (
        <span className="inline-flex items-center flex-wrap gap-2 text-xs text-slate-650 font-medium">
          {addedIds.length > 0 && (
            <span className="inline-flex items-center gap-1 flex-wrap">
              <span className="text-slate-400">Assignee added:</span>
              {addedIds.map(id => (
                <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm">
                  {getMemberName(id)}
                </span>
              ))}
            </span>
          )}
          {removedIds.length > 0 && (
            <span className="inline-flex items-center gap-1 flex-wrap">
              <span className="text-slate-400">Assignee removed:</span>
              {removedIds.map(id => (
                <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 line-through">
                  {getMemberName(id)}
                </span>
              ))}
            </span>
          )}
          {addedIds.length === 0 && removedIds.length === 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-slate-400">Assignee:</span>
              {renderValueBadge(log.newValue, log.fieldName)}
            </span>
          )}
        </span>
      );
    }

    // Format description changes
    if (log.fieldName === 'description') {
      const oldVal = log.oldValue || '';
      const newVal = log.newValue || '';
      if (!oldVal && newVal) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-650 font-medium">
            <span className="text-slate-400">Description:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
              Added description
            </span>
          </span>
        );
      }
      if (oldVal && !newVal) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-650 font-medium">
            <span className="text-slate-400">Description:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-700 shadow-sm">
              Cleared description
            </span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Description:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 shadow-sm">
            Updated description
          </span>
        </span>
      );
    }

    // Format date changes
    if (log.fieldName === 'dueDate' || log.fieldName === 'startDate') {
      const formatDate = (val: any) => {
        if (!val || val === 'None') return 'None';
        try {
          const dateObj = new Date(val);
          if (isNaN(dateObj.getTime())) return String(val);
          return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
          return String(val);
        }
      };
      const label = log.fieldName === 'dueDate' ? 'Due date' : 'Start date';
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">{label}:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
            {formatDate(log.oldValue)}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
            {formatDate(log.newValue)}
          </span>
        </span>
      );
    }

    // Format sprint changes
    if (log.fieldName === 'sprintId' || log.fieldName === 'sprint' || log.actionType === 'sprint_changed') {
      const getSprintDisplay = (val: any) => {
        if (!val || val === 'None' || val === 'null' || val === 'undefined') return 'None';
        let targetId = val;
        if (typeof val === 'object' && val) {
          if (val.sprintNumber) return val.sprintNumber;
          if (val.name) return val.name;
          targetId = val._id ? String(val._id) : String(val);
        }
        const found = sprints.find((s: any) => String(s._id) === String(targetId));
        if (found) {
          return found.sprintNumber || found.name || String(targetId);
        }
        return String(targetId);
      };

      const oldDisp = getSprintDisplay(log.oldValue);
      const newDisp = getSprintDisplay(log.newValue);

      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">Sprint:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm">
            <Zap className="w-3 h-3 text-indigo-600 shrink-0" />
            {oldDisp}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm">
            <Zap className="w-3 h-3 text-indigo-600 shrink-0" />
            {newDisp}
          </span>
        </span>
      );
    }

    if (log.fieldName) {
      const fieldLabels: Record<string, string> = {
        storyPoints: 'Story points',
        estimatedHours: 'Estimated hours',
        actualHours: 'Actual hours',
        title: 'Title',
        description: 'Description',
        parentId: 'Parent task'
      };
      
      const label = fieldLabels[log.fieldName] || log.fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
      const oldVal = formatChangeValue(log.oldValue, log.fieldName);
      const newVal = formatChangeValue(log.newValue, log.fieldName);

      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">{label}:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700 truncate max-w-[150px]" title={oldVal}>
            {oldVal}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700 truncate max-w-[150px]" title={newVal}>
            {newVal}
          </span>
        </span>
      );
    }

    // Default clean-up fallback: if description contains JSON string, strip it
    if (desc.includes('{"') || desc.includes('["')) {
      const cleanOld = formatChangeValue(log.oldValue, log.fieldName);
      const cleanNew = formatChangeValue(log.newValue, log.fieldName);
      const fieldDisplay = log.fieldName
        ? log.fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())
        : 'Field';
      return (
        <span className="inline-flex items-center flex-wrap gap-1.5 text-xs text-slate-650 font-medium">
          <span className="text-slate-400">{fieldDisplay}:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700">{cleanOld}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700">{cleanNew}</span>
        </span>
      );
    }

    return <span className="text-xs text-slate-650">{desc}</span>;
  };

  const renderValueBadge = (value: any, fieldName: string) => {
    if (value === null || value === undefined) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
          None
        </span>
      );
    }

    if (fieldName === 'status') {
      let isCustom = false;
      let name = '';
      let color = '#6B7280';
      if (typeof value === 'object' && value) {
        isCustom = true;
        name = value.name || value.label || 'None';
        color = value.color || '#6B7280';
      } else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && (parsed.name || parsed.label)) {
            isCustom = true;
            name = parsed.name || parsed.label;
            color = parsed.color || '#6B7280';
          }
        } catch {}
      }

      if (isCustom) {
        return (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{
              backgroundColor: `${color}10`,
              color: color,
              borderColor: `${color}30`
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: color }} />
            {name}
          </span>
        );
      }

      const label = getStatusLabel(value);
      const statusColors: Record<string, { bg: string, text: string }> = {
        backlog: { bg: 'bg-slate-100', text: 'text-slate-600' },
        to_do: { bg: 'bg-blue-50', text: 'text-blue-600' },
        in_progress: { bg: 'bg-amber-50', text: 'text-amber-700' },
        in_review: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
        completed: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
        cancelled: { bg: 'bg-rose-50', text: 'text-rose-600' }
      };
      const statusColor = statusColors[value] || { bg: 'bg-slate-50', text: 'text-slate-500' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor.bg} ${statusColor.text} border border-current/10`}>
          {label}
        </span>
      );
    }

    if (fieldName === 'customStatus') {
      let name = 'None';
      let color = '#6B7280';
      if (typeof value === 'object' && value) {
        name = value.name || value.label || 'None';
        color = value.color || '#6B7280';
      } else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          name = parsed.name || parsed.label || value;
          color = parsed.color || '#6B7280';
        } catch {
          name = value;
        }
      }
      return (
        <span 
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
          style={{
            backgroundColor: `${color}10`,
            color: color,
            borderColor: `${color}30`
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: color }} />
          {name}
        </span>
      );
    }

    if (fieldName === 'priority') {
      const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'None';
      const colors: Record<string, { bg: string, text: string }> = {
        low: { bg: 'bg-slate-100', text: 'text-slate-600' },
        medium: { bg: 'bg-blue-50', text: 'text-blue-600' },
        high: { bg: 'bg-orange-50', text: 'text-orange-600' },
        critical: { bg: 'bg-red-50', text: 'text-red-600 font-bold' }
      };
      const color = colors[value] || { bg: 'bg-slate-50', text: 'text-slate-500' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${color.bg} ${color.text} border border-current/10`}>
          {label}
        </span>
      );
    }

    if (fieldName === 'assignee' || fieldName === 'assignedTo') {
      const projectMembers: any[] = [];
      if (project?.managerId) projectMembers.push(project.managerId);
      project?.members?.forEach((m: any) => {
        if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
          projectMembers.push(m.employeeId);
        }
      });
      const getNames = (val: any) => {
        const ids = Array.isArray(val) ? val : [val];
        return ids.map(id => {
          const m = projectMembers.find(member => member._id === id);
          return m?.name || id;
        }).join(', ');
      };
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700">
          {getNames(value)}
        </span>
      );
    }

    // Default formatting
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700">
        {formatChangeValue(value, fieldName)}
      </span>
    );
  };

  const handleOpenEditModal = (task: TaskItem) => {
    setSelectedTask(task);
    setSelectedLabels(task.labels || []);
    setTaskAttachments(task.attachments || []);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      taskType: task.taskType || 'task',
      assignedTo: Array.isArray(task.assignedTo)
        ? task.assignedTo.map(a => a._id)
        : ((task.assignedTo as any)?._id ? [(task.assignedTo as any)._id] : []),
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      storyPoints: task.storyPoints?.toString() || '',
      estimatedHours: task.estimatedHours?.toString() || '',
      actualHours: task.actualHours?.toString() || '',
      parentId: (typeof task.parentId === 'object' ? task.parentId?._id : task.parentId) || '',
      linkedItems: '',
      customStatus: (task as any).customStatus || null,
      sprintId: (typeof task.sprintId === 'object' ? task.sprintId?._id : task.sprintId) || '',
    });
    fetchSubtasks(task._id);
    fetchActivityLogs(task._id);
    setShowEditModal(true);
  };

  const fetchActivityLogs = async (taskId: string) => {
    try {
      const response = await fetch(`/api/activity-logs?taskId=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || isSavingRef.current) return;

    // Check if there are any actual changes
    const hasChanges = (
      formData.title !== selectedTask.title ||
      formData.description !== selectedTask.description ||
      formData.status !== selectedTask.status ||
      formData.priority !== selectedTask.priority ||
      formData.taskType !== (selectedTask.taskType || 'task') ||
      JSON.stringify(formData.assignedTo || []) !== JSON.stringify(
        Array.isArray(selectedTask.assignedTo)
          ? selectedTask.assignedTo.map(a => a._id)
          : ((selectedTask.assignedTo as any)?._id ? [(selectedTask.assignedTo as any)._id] : [])
      ) ||
      formData.dueDate !== (selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '') ||
      formData.startDate !== (selectedTask.startDate ? new Date(selectedTask.startDate).toISOString().split('T')[0] : '') ||
      formData.storyPoints !== (selectedTask.storyPoints?.toString() || '') ||
      formData.estimatedHours !== (selectedTask.estimatedHours?.toString() || '') ||
      formData.actualHours !== (selectedTask.actualHours?.toString() || '') ||
      formData.parentId !== ((typeof selectedTask.parentId === 'object' ? selectedTask.parentId?._id : selectedTask.parentId) || '') ||
      JSON.stringify(taskAttachments) !== JSON.stringify(selectedTask.attachments || []) ||
      JSON.stringify(selectedLabels) !== JSON.stringify(selectedTask.labels || []) ||
      JSON.stringify(formData.customStatus) !== JSON.stringify((selectedTask as any).customStatus || null) ||
      formData.sprintId !== ((typeof selectedTask.sprintId === 'object' ? selectedTask.sprintId?._id : selectedTask.sprintId) || '')
    );

    if (!hasChanges) {
      // No changes, just close the modal
      setSelectedTask(null);
      setShowEditModal(false);
      return;
    }

    try {
      isSavingRef.current = true;
      setIsAutoSaving(true);
      const updatePayload = {
        taskId: selectedTask._id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        taskType: formData.taskType,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate || null,
        startDate: formData.startDate || null,
        storyPoints: formData.storyPoints ? parseFloat(formData.storyPoints) : null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
        parentId: formData.parentId || null,
        attachments: taskAttachments,
        labels: selectedLabels,
        sprintId: formData.sprintId || null,
        customStatus: formData.customStatus || null,
      };

      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTask(null);
        setShowEditModal(false);
        await fetchTasks();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to save task" });
    } finally {
      setIsAutoSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 500);
    }
  };



  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task deleted" });
        fetchTasks();
        fetchBacklogTasks();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete task" });
    }
  };

  const handleFileUpload = async (file: File): Promise<{ name: string; url: string } | null> => {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'hrm/tasks');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return { name: file.name, url: data.secure_url || data.url };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to upload file' });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      const response = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskId: selectedTask._id, 
          text: newComment,
          attachments: commentAttachments 
        }),
      });
      if (response.ok) {
        const data = await response.json();
        addToast({ type: 'success', title: 'Comment added', description: 'Your comment has been saved.' });
        setNewComment('');
        setShowMentionList(false);
        setCommentAttachments([]);
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
        const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`);
        const tasksData = await tasksRes.json();
        const freshTask = tasksData.tasks.find((t: any) => t._id === selectedTask._id);
        if (freshTask) {
          setSelectedTask(freshTask);
        }
        fetchTasks();
        fetchBacklogTasks();
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to link tasks' });
    }
  };

  const handleDeleteLink = async (targetTaskId: string, type: 'dependsOn' | 'blocks' | 'relatesTo' | 'duplicates' | 'isDuplicatedBy') => {
    if (!selectedTask) return;
    try {
      const response = await fetch(`/api/tasks/link?taskId=${selectedTask._id}&targetTaskId=${targetTaskId}&linkType=${type}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        addToast({ type: 'success', title: 'Link removed', description: 'Link deleted successfully.' });
        
        // Refresh selected task details
        const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`);
        const tasksData = await tasksRes.json();
        const freshTask = tasksData.tasks.find((t: any) => t._id === selectedTask._id);
        if (freshTask) {
          setSelectedTask(freshTask);
        }
        fetchTasks();
        fetchBacklogTasks();
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
          projectId: selectedTask.projectId?._id || projectId,
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

  const handleDragStart = (task: TaskItem) => {
    setDraggedTask(task);
    // Store task ID in data transfer for proper drag and drop
    const event = window.event as DragEvent;
    if (event && event.dataTransfer) {
      event.dataTransfer.setData('taskId', task._id);
      event.dataTransfer.effectAllowed = 'move';
    }
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

    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t._id === taskId);

    if (!task) {
      setDraggedTask(null);
      return;
    }

    // Check if transition is allowed based on project workflow rules
    const currentColumn = project?.board?.columns?.find((col) => col.status === task.status);
    if (currentColumn && currentColumn.allowedTransitions && !currentColumn.allowedTransitions.includes(status)) {
      setTransitionError({
        show: true,
        message: `Cannot move task from "${currentColumn.name}" to this status according to workflow rules.`
      });
      setDraggedTask(null);
      return;
    }

    // Check WIP limit
    const column = project?.board?.columns?.find((col) => col.status === status);
    const tasksInColumn = tasks.filter(t => t.status === status).length;

    if (column?.wipLimit && tasksInColumn >= column.wipLimit) {
      addToast({
        type: "error",
        title: "WIP Limit Reached",
        description: `Cannot move task. ${column.name} has reached its WIP limit of ${column.wipLimit}.`
      });
      setDraggedTask(null);
      return;
    }

    // If column has custom statuses, show modal to select custom status
    if (column?.customStatuses && column.customStatuses.length > 0) {
      setSelectedTaskForCustomStatus(task);
      setTargetColumnForCustomStatus(status);
      setShowCustomStatusModal(true);
      setDraggedTask(null);
      return;
    }

    // Otherwise, just update the status without custom status
    try {
      const updatePayload: any = { taskId: task._id, status, customStatus: null };

      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task status updated" });
        if (selectedTask?._id === task._id) fetchActivityLogs(task._id);
        fetchTasks();
      } else {
        const errorData = await response.json();
        if (errorData.error === 'TRANSITION_NOT_ALLOWED') {
          setTransitionError({
            show: true,
            message: errorData.message
          });
        } else {
          addToast({ type: "error", title: "Error", description: "Failed to update task status" });
        }
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update task status" });
    }
    setDraggedTask(null);
  };

  const handleCustomStatusSelect = async (customStatus: any) => {
    if (!selectedTaskForCustomStatus || !targetColumnForCustomStatus) return;

    try {
      const updatePayload: any = {
        taskId: selectedTaskForCustomStatus._id,
        status: targetColumnForCustomStatus,
        customStatus: customStatus
      };

      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task status updated" });
        if (selectedTask?._id === selectedTaskForCustomStatus._id) fetchActivityLogs(selectedTask._id);
        fetchTasks();
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update task status" });
    }
    setShowCustomStatusModal(false);
    setSelectedTaskForCustomStatus(null);
    setTargetColumnForCustomStatus(null);
  };

  const handleOpenCreateModal = (status: string) => {
    setCreateStatus(status);
    setCreateTaskType('task');
    setCreateTaskPriority('medium');
    setCreateTaskAssignees([]);
    setCreateTaskParentId('');
    setShowCreateModal(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const requestBody = {
        ...taskData,
        projectId,
        status: createStatus,
        assignedBy: (user as any)?._id,
        companyId: user?.companyId,
        // Only assign sprintId if creating in a sprint (not backlog)
        ...(createStatus !== 'backlog' && selectedSprintId ? { sprintId: selectedSprintId } : {}),
        ...(taskData.customStatus ? { customStatus: taskData.customStatus } : {}),
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task created successfully" });
        setShowCreateModal(false);
        fetchTasks();
        // Also fetch backlog tasks if creating in backlog view
        if (createStatus === 'backlog') {
          fetchBacklogTasks();
        }
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to create task" });
    }
  };

  const epicTasks = useMemo(() => {
    return tasks.filter(task => task.taskType === 'epic');
  }, [tasks]);

  const filteredTasks = tasks;

  const statusLabels: Record<string, string> = {
    backlog: 'Backlog',
    to_do: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    completed: 'Done',
  };

  const statusThemes: Record<string, { dot: string; lightBg: string }> = {
    backlog: { dot: 'bg-slate-400', lightBg: 'bg-slate-100' },
    to_do: { dot: 'bg-blue-500', lightBg: 'bg-blue-50' },
    in_progress: { dot: 'bg-amber-500', lightBg: 'bg-amber-50' },
    in_review: { dot: 'bg-purple-500', lightBg: 'bg-purple-50' },
    completed: { dot: 'bg-emerald-500', lightBg: 'bg-emerald-50' },
  };

  const statusColors: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-700',
    to_do: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    in_review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    critical: 'bg-red-100 text-red-600',
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

  const typeIconMap: Record<string, React.ReactNode> = {
    task:        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
    story:       <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
    bug:         <Bug className="w-3.5 h-3.5 text-red-500" />,
    epic:        <Zap className="w-3.5 h-3.5 text-purple-500" />,
    subtask:     <Layers className="w-3.5 h-3.5 text-slate-400" />,
    improvement: <TrendingUp className="w-3.5 h-3.5 text-orange-400" />,
  };

  const columns = (project?.board?.columns || [
    { id: 'todo', name: 'To Do', status: 'to_do', color: '#3B82F6' },
    { id: 'inprogress', name: 'In Progress', status: 'in_progress', color: '#F59E0B' },
    { id: 'review', name: 'In Review', status: 'in_review', color: '#8B5CF6' },
    { id: 'done', name: 'Done', status: 'completed', color: '#10B981' },
  ]).filter(col => col.status !== 'backlog');

  const renderFilterBar = (widthClass: string) => {
    const maxAvatars = 5;
    const members = project?.members || [];
    const visibleMembers = members.slice(0, maxAvatars);
    const remainingCount = members.length - maxAvatars;

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className={`${widthClass} h-[66px] bg-slate-50/40 border border-slate-200/60 rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3 w-full`}>
          {/* Unified Intelligent Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              {/* Sparkles Mode Indicator / Manual Toggle Button */}
              <button
                type="button"
                onClick={toggleAiMode}
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 p-0.5 rounded transition-all duration-200 ${
                  aiMode 
                    ? 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 animate-pulse' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={aiMode ? "AI Mode Active (Click to switch to simple search)" : "Simple Search Active (Click to switch to AI search)"}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>

              <input
                type="text"
                placeholder={
                  aiMode 
                    ? 'Ask AI (e.g. "today tasks to me in progress")' 
                    : 'Search tasks by name or description...'
                }
                value={searchVal}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={aiLoading}
                className={`pl-10 pr-10 py-2.5 w-full text-xs bg-white rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                  aiMode 
                    ? 'border-2 border-indigo-400 focus:ring-indigo-400/20 text-indigo-955 placeholder-indigo-400' 
                    : 'border border-slate-200 focus:border-blue-500 focus:ring-blue-400/20 text-slate-700 placeholder-slate-400'
                }`}
              />

              {(searchVal || aiActive) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={aiLoading || !searchVal.trim()}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                aiMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white'
              }`}
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : aiMode ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {aiMode ? 'Ask AI' : 'Search'}
            </button>
          </form>

        {/* Overlapping Assignees/Members list */}
        <div className="flex -space-x-1.5 items-center shrink-0 mx-2">
          {visibleMembers.map((member) => {
            const user = member.employeeId;
            if (!user) return null;
            
            const isSelected = filters.assignee.includes(user._id);
            const hasAnySelected = filters.assignee.length > 0;
            
            const stateClass = hasAnySelected
              ? isSelected
                ? 'ring-2 ring-indigo-500 ring-offset-2 z-10 scale-105 opacity-100'
                : 'opacity-40 hover:opacity-80 scale-95'
              : 'opacity-100 hover:scale-105 hover:z-10';
              
            const name = user.name || 'User';
            const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            
            const getAvatarBg = (val: string) => {
              const list = [
                'bg-indigo-600 text-white',
                'bg-blue-600 text-white',
                'bg-emerald-600 text-white',
                'bg-amber-600 text-white',
                'bg-rose-600 text-white',
                'bg-violet-600 text-white',
                'bg-sky-600 text-white'
              ];
              let h = 0;
              for (let i = 0; i < val.length; i++) {
                h = val.charCodeAt(i) + ((h << 5) - h);
              }
              return list[Math.abs(h) % list.length];
            };

            return (
              <button
                key={user._id}
                onClick={() => {
                  setFilters(prev => ({
                    ...prev,
                    assignee: prev.assignee.includes(user._id)
                      ? prev.assignee.filter(a => a !== user._id)
                      : [...prev.assignee, user._id]
                  }));
                }}
                className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm transition-all duration-200 focus:outline-none shrink-0 ${getAvatarBg(name)} ${stateClass}`}
                title={name}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
            );
          })}
          {remainingCount > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 z-10">
              +{remainingCount}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Epic Filter */}
          <div className="relative" data-filter-dropdown="epic">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'epic' ? null : 'epic');
                setFilterSearchQuery('');
              }}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                activeFilterDropdown === 'epic' || filters.epic.length > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Epic {filters.epic.length > 0 && `(${filters.epic.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {activeFilterDropdown === 'epic' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search epics..."
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {epicTasks.length > 0 ? (
                    epicTasks.filter(epic => 
                      epic.title.toLowerCase().includes(filterSearchQuery.toLowerCase())
                    ).map(epic => (
                      <button
                        key={epic._id}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            epic: prev.epic.includes(epic._id)
                              ? prev.epic.filter(e => e !== epic._id)
                              : [...prev.epic, epic._id]
                          }));
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          filters.epic.includes(epic._id) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{epic.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{epic.taskNumber}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">No epics in this project</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Task Type Filter */}
          <div className="relative" data-filter-dropdown="taskType">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'taskType' ? null : 'taskType');
                setFilterSearchQuery('');
              }}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                activeFilterDropdown === 'taskType' || filters.taskType.length > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Type {filters.taskType.length > 0 && `(${filters.taskType.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {activeFilterDropdown === 'taskType' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search type..."
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {Object.entries(taskTypeLabels).filter(([key, label]) => 
                    label.toLowerCase().includes(filterSearchQuery.toLowerCase())
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          taskType: prev.taskType.includes(key)
                            ? prev.taskType.filter(t => t !== key)
                            : [...prev.taskType, key]
                        }));
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                        filters.taskType.includes(key) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* More Filter */}
          <div className="relative" data-filter-dropdown="more">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'more' ? null : 'more');
                setFilterSearchQuery('');
              }}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                activeFilterDropdown === 'more' || filters.status.length > 0 || filters.priority.length > 0 || filters.labels.length > 0 || filters.storyPoints || filters.dueDate
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              More
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {activeFilterDropdown === 'more' && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-3 space-y-4 max-h-[400px] overflow-y-auto">
                {/* Status Option */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            status: prev.status.includes(key)
                              ? prev.status.filter(s => s !== key)
                              : [...prev.status, key]
                          }));
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                          filters.status.includes(key)
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Option */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Priority</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['low', 'medium', 'high', 'critical'].map((prio) => (
                      <button
                        key={prio}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            priority: prev.priority.includes(prio)
                              ? prev.priority.filter(p => p !== prio)
                              : [...prev.priority, prio]
                          }));
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border capitalize transition-all ${
                          filters.priority.includes(prio)
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Story Points Filter */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Story Points (Min)</span>
                  <input
                    type="number"
                    placeholder="Min points..."
                    value={filters.storyPoints}
                    onChange={(e) => setFilters(prev => ({ ...prev, storyPoints: e.target.value }))}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                {/* Due Date Filter */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Due Date (Before)</span>
                  <input
                    type="date"
                    value={filters.dueDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                {/* Labels Filter */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Labels</span>
                  <div className="flex flex-wrap gap-1">
                    {allLabels.map((label) => {
                      const isSelected = filters.labels.includes(label._id);
                      return (
                        <button
                          key={label._id}
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              labels: prev.labels.includes(label._id)
                                ? prev.labels.filter(l => l !== label._id)
                                : [...prev.labels, label._id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                            isSelected
                              ? 'text-white border-transparent'
                              : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                          }`}
                          style={{
                            backgroundColor: isSelected ? label.color : undefined,
                          }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {(filters.assignee.length > 0 || filters.taskType.length > 0 || filters.status.length > 0 || filters.priority.length > 0 || filters.labels.length > 0 || filters.storyPoints || filters.dueDate || filters.epic.length > 0) && (
            <button
              onClick={() => setFilters({ taskType: [], status: [], priority: [], assignee: [], dueDate: '', storyPoints: '', labels: [], epic: [] })}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-650 hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {aiActive && aiExplanation && (
        <div className="text-[10.5px] text-indigo-700 bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5 w-full mt-1">
          <span className="font-bold">AI Query:</span>
          <span className="italic">{aiExplanation}</span>
        </div>
      )}
    </div>
  );
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project?.name}</h1>
            <p className="text-sm text-gray-500">{project?.projectNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Selector - labeled */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {[
              { view: 'board',    icon: KanbanSquare, label: 'Board' },
              { view: 'list',     icon: List,         label: 'List' },
              { view: 'backlog',  icon: LayoutList,   label: 'Backlog' },
              { view: 'timeline', icon: CalendarIcon, label: 'Timeline' },
              { view: 'docs',     icon: Vault,        label: 'Vault' },
              { view: 'rules',    icon: Settings,     label: 'Automation' },
              { view: 'ai-chat',  icon: Sparkles,     label: 'AI Chat' },
            ].map(({ view, icon: Icon, label }) => (
              <button
                key={view}
                onClick={() => router.push(`/projects/${projectId}/${view}`)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === view
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
                title={`${label} view`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => handleOpenCreateModal(viewMode === 'backlog' ? 'backlog' : 'to_do')}>
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'board' && (
        <>
          {/* Sprints and Filter Row */}
          {sprints.length > 0 ? (
            <div className="flex items-center gap-4 mb-6 w-full">
              {/* Sprint Display (30%) */}
              {(() => {
                const formatDatePeriod = (startStr: string | Date, endStr: string | Date) => {
                  const start = new Date(startStr);
                  const end = new Date(endStr);
                  const formatOption: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                  return `${start.toLocaleDateString('en-US', formatOption)} - ${end.toLocaleDateString('en-US', formatOption)}`;
                };

                const sprintOptions = [
                  { 
                    value: "", 
                    label: "All Sprints", 
                    icon: <Layers className="w-3.5 h-3.5 text-slate-400" /> 
                  },
                  ...sprints.map((sprint) => {
                    const start = new Date(sprint.startDate);
                    const end = new Date(sprint.endDate);
                    const now = new Date();
                    const isCurrent = now >= start && now <= end;
                    return {
                      value: sprint._id,
                      label: sprint.name + (isCurrent ? ' • Active' : ''),
                      icon: <Zap className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'}`} />
                    };
                  })
                ];

                return (
                  <div className="w-[30%] shrink-0 h-[66px] bg-white border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-650 shadow-sm shrink-0">
                        <Zap className="w-4 h-4 fill-indigo-100" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">Sprint Board</span>
                          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100/40 px-1.5 py-0.5 rounded-full shrink-0">
                            {sprints.length}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate font-medium">
                          {selectedSprintId ? (
                            (() => {
                              const sprint = sprints.find(s => s._id === selectedSprintId);
                              return sprint ? sprint.name : 'Select a sprint';
                            })()
                          ) : (
                            'Showing all tasks'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="w-32 shrink-0">
                      <CustomSelect
                        value={selectedSprintId || ''}
                        onChange={(val) => setSelectedSprintId(val || null)}
                        options={sprintOptions}
                        buttonClassName="py-1 px-2.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 shadow-sm text-[10px] font-semibold text-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Filter Container (70%) */}
              {renderFilterBar("w-[70%] shrink-0")}
            </div>
          ) : (
            <div className="w-full mb-6">
              {renderFilterBar("w-full")}
            </div>
          )}

          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-thin">
          {columns.map((column) => {
          const theme = statusThemes[column.status] || statusThemes.backlog;
          const activeColor = column.color || (
            column.status === 'to_do' ? '#3B82F6' :
            column.status === 'in_progress' ? '#F59E0B' :
            column.status === 'in_review' || column.status === 'qa' ? '#8B5CF6' :
            column.status === 'completed' || column.status === 'stage' ? '#10B981' :
            '#64748B'
          );
          const columnTasks = filteredTasks.filter(t => {
            const matchesStatus = t.status === column.status;
            const taskSprintId = (t.sprintId as any)?._id || t.sprintId;
            // When no sprint is selected (All Sprints), show all tasks
            // When a sprint is selected, show only tasks from that sprint
            const matchesSprint = !selectedSprintId || taskSprintId === selectedSprintId;
            return matchesStatus && matchesSprint;
          });
          const taskCount = columnTasks.length;
          const wipLimit = column.wipLimit;
          const isOverWip = wipLimit ? taskCount > wipLimit : false;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.status)}
              style={{
                backgroundColor: dragOverColumn === column.status ? undefined : (isOverWip ? undefined : `${activeColor}0D`),
                borderTop: `3px solid ${activeColor}`,
                boxShadow: `0 4px 16px -2px ${activeColor}15`
              }}
              className={`flex-shrink-0 w-80 rounded-2xl border p-4 transition-all duration-200 flex flex-col space-y-4 ${
                dragOverColumn === column.status 
                  ? 'border-indigo-500 bg-indigo-50/30 shadow-[inset_0_2px_8px_rgba(99,102,241,0.05)]' 
                  : isOverWip
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200/60'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: activeColor }} />
                  <h3 className="font-bold text-sm text-slate-800 truncate">{column.name}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {user?.role !== 'employee' && (
                    <button
                      onClick={() => {
                        setSelectedColumn(column);
                        setShowColumnSettings(true);
                      }}
                      className="w-5 h-5 rounded-md hover:bg-slate-200/80 border border-transparent hover:border-slate-300/40 flex items-center justify-center text-slate-500 hover:text-indigo-650 transition-all"
                      title="Column settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenCreateModal(column.status)}
                    className="w-5 h-5 rounded-md hover:bg-slate-200/80 border border-transparent hover:border-slate-300/40 flex items-center justify-center text-slate-500 hover:text-indigo-650 transition-all"
                    title={`Create task in ${column.name}`}
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
              <div className="space-y-3 min-h-[350px] overflow-y-auto pr-0.5 scrollbar-thin relative">
                {tasksLoading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-20">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
                  </div>
                )}
                {taskCount === 0 ? (
                  <button
                    onClick={() => handleOpenCreateModal(column.status)}
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
                        onClick={() => handleOpenEditModal(task)}
                        className="cursor-grab active:cursor-grabbing hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 hover:border-slate-350 rounded-xl bg-white transition-all duration-200 select-none group"
                      >
                        <CardContent className="p-3.5 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                {task.taskNumber}
                              </span>
                              {/* Priority Badge */}
                              {task.priority && (
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                    task.priority === 'critical' ? 'bg-red-100 text-red-600' :
                                    task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-slate-100 text-slate-500'
                                  }`}
                                  title={task.priority}
                                >
                                  {task.priority === 'critical' && <AlertTriangle className="w-3 h-3" />}
                                  {task.priority === 'high' && <ArrowUp className="w-3 h-3" />}
                                  {task.priority === 'medium' && <Minus className="w-3 h-3" />}
                                  {task.priority === 'low' && <ArrowDown className="w-3 h-3" />}
                                </div>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-3.5 h-3.5 text-slate-350" />
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800 text-xs line-clamp-2 leading-relaxed group-hover:text-indigo-650 transition-colors">
                              {task.title}
                            </h4>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5">
                            {(task as any).customStatus ? (
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: `${(task as any).customStatus.color}15`,
                                  color: (task as any).customStatus.color
                                }}
                              >
                                {(task as any).customStatus.name}
                              </span>
                            ) : (
                              /* Broad Column Status Badge (shown when no custom status) */
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getStatusColor(task.status).bg,
                                  color: getStatusColor(task.status).text
                                }}
                              >
                                {getStatusLabel(task.status)}
                              </span>
                            )}
                          </div>

                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {task.labels.slice(0, 3).map((label: any) => (
                                <span
                                  key={label._id}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                                  style={{
                                    backgroundColor: `${label.color}15`,
                                    borderColor: `${label.color}35`,
                                    color: label.color
                                  }}
                                >
                                  {label.name}
                                </span>
                              ))}
                              {task.labels.length > 3 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-200 text-slate-600">
                                  +{task.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Mini Progress Bar */}
                          {task.progressPercentage > 0 && (
                            <div className="space-y-1 pt-0.5">
                              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                <span>Progress</span>
                                <span>{task.progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div className="h-1 bg-indigo-600 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400">
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              )}
                            </div>
                            {task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
                              <div className="flex -space-x-1.5 shrink-0 ml-auto">
                                {task.assignedTo.slice(0, 3).map((assignee: any, idx: number) => {
                                  return (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInsertMentionFromBadge(assignee.name);
                                      }}
                                      className={`w-6 h-6 rounded-full ${getAvatarColor(idx)} text-white flex items-center justify-center text-[9px] font-bold border border-white shadow-sm hover:scale-110 transition-transform cursor-pointer shrink-0`}
                                      title={`Click to mention @${assignee.name}`}
                                    >
                                      {getInitials(assignee.name)}
                                    </button>
                                  );
                                })}
                                {task.assignedTo.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-white shadow-sm text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0 z-10">
                                    +{task.assignedTo.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
        </>)}

      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Sprints and Filter Row */}
          {sprints.length > 0 ? (
            <div className="flex items-center gap-4 w-full">
              {/* Sprint Display */}
              {(() => {
                const sprintOptions = [
                  { 
                    value: "", 
                    label: "All Sprints", 
                    icon: <Layers className="w-3.5 h-3.5 text-slate-400" /> 
                  },
                  ...sprints.map((sprint) => {
                    const start = new Date(sprint.startDate);
                    const end = new Date(sprint.endDate);
                    const now = new Date();
                    const isCurrent = now >= start && now <= end;
                    return {
                      value: sprint._id,
                      label: sprint.name + (isCurrent ? ' • Active' : ''),
                      icon: <Zap className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'}`} />
                    };
                  })
                ];

                return (
                  <div className="w-[30%] shrink-0 h-[66px] bg-white border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-650 shadow-sm shrink-0">
                        <Zap className="w-4 h-4 fill-indigo-100" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">Sprint List</span>
                          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100/40 px-1.5 py-0.5 rounded-full shrink-0">
                            {sprints.length}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate font-medium">
                          {selectedSprintId ? (
                            (() => {
                              const sprint = sprints.find(s => s._id === selectedSprintId);
                              return sprint ? sprint.name : 'Select a sprint';
                            })()
                          ) : (
                            'Showing all tasks'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="w-32 shrink-0">
                      <CustomSelect
                        value={selectedSprintId || ''}
                        onChange={(val) => setSelectedSprintId(val || null)}
                        options={sprintOptions}
                        buttonClassName="py-1 px-2.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 shadow-sm text-[10px] font-semibold text-slate-800 rounded-xl"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Filter Container */}
              {renderFilterBar("w-[70%] shrink-0")}
            </div>
          ) : (
            <div className="w-full">
              {renderFilterBar("w-full")}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 relative">
                    {tasksLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-650" />
                            <span>Loading tasks...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const displayTasks = filteredTasks.filter(t => {
                          if (!selectedSprintId) return true;
                          const taskSprintId = (t.sprintId as any)?._id || t.sprintId;
                          return taskSprintId === selectedSprintId;
                        });

                        if (displayTasks.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                              No tasks found
                            </td>
                          </tr>
                        );
                      }

                      return displayTasks.map((task) => (
                      <tr 
                        key={task._id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleOpenEditModal(task)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono text-gray-600">{task.taskNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xl">{task.title}</div>
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {task.labels.slice(0, 2).map((label: any) => (
                                <span
                                  key={label._id}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                                  style={{
                                    backgroundColor: `${label.color}15`,
                                    borderColor: `${label.color}35`,
                                    color: label.color
                                  }}
                                >
                                  {label.name}
                                </span>
                              ))}
                              {task.labels.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600">
                                  +{task.labels.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(task as any).customStatus ? (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${(task as any).customStatus.color}15`,
                                color: (task as any).customStatus.color
                              }}
                            >
                              {(task as any).customStatus.name}
                            </span>
                          ) : (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: getStatusColor(task.status).bg,
                                color: getStatusColor(task.status).text
                              }}
                            >
                              {getStatusLabel(task.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {task.priority}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? (
                            <div className="flex -space-x-1.5 shrink-0">
                              {task.assignedTo.slice(0, 3).map((assignee: any, idx: number) => {
                                return (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInsertMentionFromBadge(assignee.name);
                                    }}
                                    className={`w-6 h-6 rounded-full ${getAvatarColor(idx)} text-white flex items-center justify-center text-[9px] font-bold border border-white shadow-sm hover:scale-110 transition-transform cursor-pointer shrink-0`}
                                    title={`Click to mention @${assignee.name}`}
                                  >
                                    {getInitials(assignee.name)}
                                  </button>
                                );
                              })}
                              {task.assignedTo.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-white shadow-sm text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                                  +{task.assignedTo.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-1.5 bg-indigo-600 rounded-full" 
                                style={{ width: `${task.progressPercentage}%` }} 
                              />
                            </div>
                            <span className="text-xs text-gray-600">{task.progressPercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ));
                  })())}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
      
      {viewMode === 'backlog' && (() => {
        const allMembers: any[] = [];
        if (project?.managerId) allMembers.push(project.managerId);
        project?.members?.forEach((m: any) => {
          if (m.employeeId && !allMembers.some((p: any) => p._id === m.employeeId._id)) allMembers.push(m.employeeId);
        });
        const allSelected = backlogTasks.length > 0 && backlogTasks.every(t => selectedBacklogIds.has(t._id));
        const someSelected = selectedBacklogIds.size > 0;
        const typeIconMap: Record<string, React.ReactNode> = {
          task:        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
          story:       <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
          bug:         <Bug className="w-3.5 h-3.5 text-red-500" />,
          epic:        <Zap className="w-3.5 h-3.5 text-purple-500" />,
          subtask:     <Layers className="w-3.5 h-3.5 text-slate-400" />,
          improvement: <TrendingUp className="w-3.5 h-3.5 text-orange-400" />,
        };
        const priorityPillMap: Record<string, string> = {
          low:      'bg-slate-100 text-slate-600',
          medium:   'bg-yellow-100 text-yellow-700',
          high:     'bg-orange-100 text-orange-700',
          critical: 'bg-red-100 text-red-700',
        };
        return (
          <div className="space-y-8 pb-20">
            {/* Sprints Section */}
            {sprints.length > 0 && (
              <div className="space-y-5">
                {sprints.map(sprint => {
                  const sprintTasks = backlogTasks.filter(t => ((t.sprintId as any)?._id || t.sprintId) === sprint._id);
                  const sprintAllSelected = sprintTasks.length > 0 && sprintTasks.every(t => selectedBacklogIds.has(t._id));
                  const startFmt = new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const endFmt = new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div 
                      key={sprint._id} 
                      className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-200 ${
                        dragOverSprintId === sprint._id ? 'border-indigo-400 ring-4 ring-indigo-400/20' : 'border-slate-200'
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSprintId(sprint._id); }}
                      onDragLeave={() => setDragOverSprintId(null)}
                      onDrop={(e) => handleDropTaskOnSprint(e, sprint._id)}
                    >
                      {/* Sprint header */}
                      <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100 flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          checked={sprintAllSelected}
                          onChange={() => {
                            if (sprintAllSelected) {
                              setSelectedBacklogIds(prev => { const n = new Set(prev); sprintTasks.forEach(t => n.delete(t._id)); return n; });
                            } else {
                              setSelectedBacklogIds(prev => { const n = new Set(prev); sprintTasks.forEach(t => n.add(t._id)); return n; });
                            }
                          }}
                        />
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700">{sprint.sprintNumber}</span>
                          {editingSprintId === sprint._id ? (
                            <input 
                              type="text" 
                              autoFocus
                              value={editingSprintName}
                              onChange={e => setEditingSprintName(e.target.value)}
                              onBlur={() => handleRenameSprint(sprint._id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameSprint(sprint._id);
                                if (e.key === 'Escape') setEditingSprintId(null);
                              }}
                              disabled={editingSprintLoading}
                              className="text-xs font-semibold text-slate-700 bg-white border border-indigo-300 rounded-lg px-2 py-1 w-48 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <span 
                              className="text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-600 hover:underline decoration-dashed underline-offset-2"
                              onClick={() => { setEditingSprintId(sprint._id); setEditingSprintName(sprint.name); }}
                              title="Click to edit sprint name"
                            >
                              {sprint.name}
                            </span>
                          )}
                        </div>
                        <div className="h-4 w-px bg-slate-200 mx-2" />
                        <span className="text-[11px] text-slate-500 font-medium">{startFmt} → {endFmt}</span>
                        <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          sprint.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          sprint.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                          'bg-indigo-100 text-indigo-600'
                        }`}>{sprint.status}</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                          <span className="text-[11px] font-bold text-slate-600">{sprintTasks.length}</span>
                          <span className="text-[10px] text-slate-400">items</span>
                        </div>
                      </div>
                      
                      {/* Sprint Column Headers */}
                      {sprintTasks.length > 0 && (
                        <div className="grid grid-cols-[16px_96px_1fr_180px_28px_52px_20px_24px] items-center gap-3 px-5 py-2 border-b border-slate-100 bg-slate-50/50">
                          <span />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                          <span />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Who</span>
                          <span />
                          <span />
                          <span />
                        </div>
                      )}

                      {/* Sprint task rows */}
                      <div className="divide-y divide-slate-100 min-h-[40px]">
                        {sprintTasks.length === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                              <Zap className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-400 font-medium">No tasks in this sprint yet</p>
                            <p className="text-[10px] text-slate-300 mt-1">Drag tasks here or create new ones</p>
                          </div>
                        ) : sprintTasks.map(task => {
                          const isSelected = selectedBacklogIds.has(task._id);
                          const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
                          const priorityIconMap: Record<string, React.ReactNode> = {
                            low: <ArrowUp className="w-3 h-3 text-slate-500" />,
                            medium: <Minus className="w-3 h-3 text-yellow-600" />,
                            high: <AlertTriangle className="w-3 h-3 text-orange-600" />,
                            critical: <AlertCircle className="w-3 h-3 text-red-600" />,
                          };
                          return (
                            <div 
                              key={task._id} 
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('taskId', task._id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              className={`grid grid-cols-[16px_96px_1fr_180px_28px_52px_20px_24px] items-center gap-3 px-5 py-2.5 transition-colors group cursor-grab active:cursor-grabbing ${
                                isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" checked={isSelected} onChange={() => toggleBacklogSelect(task._id)} />
                              <span className="text-xs font-mono text-slate-400 truncate">{task.taskNumber}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(task);
                                }}
                                className="text-left text-sm font-medium text-slate-800 truncate hover:text-indigo-600 transition-colors"
                              >
                                {task.title}
                              </button>
                              <div className="flex items-center gap-1">
                                {/* Status Badge (custom or column) */}
                                {(task as any).customStatus ? (
                                  <span
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${(task as any).customStatus.color}15`,
                                      color: (task as any).customStatus.color
                                    }}
                                  >
                                    {(task as any).customStatus.name}
                                  </span>
                                ) : (
                                  <span
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: getStatusColor(task.status).bg,
                                      color: getStatusColor(task.status).text
                                    }}
                                  >
                                    {getStatusLabel(task.status)}
                                  </span>
                                )}
                                {/* Labels */}
                                {task.labels && task.labels.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {task.labels.slice(0, 2).map((label: any) => (
                                      <span
                                        key={label._id}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                                        style={{
                                          backgroundColor: `${label.color}15`,
                                          borderColor: `${label.color}35`,
                                          color: label.color
                                        }}
                                      >
                                        {label.name}
                                      </span>
                                    ))}
                                    {task.labels.length > 2 && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-200 text-slate-600">
                                        +{task.labels.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                                task.status === 'to_do' ? 'bg-slate-100 text-slate-600' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                task.status === 'in_review' ? 'bg-purple-100 text-purple-600' :
                                task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {task.status === 'to_do' && <CheckCircle className="w-3.5 h-3.5" />}
                                {task.status === 'in_progress' && <Clock className="w-3.5 h-3.5" />}
                                {task.status === 'in_review' && <MessageSquare className="w-3.5 h-3.5" />}
                                {task.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                              </span>
                              {assignees.length > 0 ? (
                                <div className="flex -space-x-1.5 shrink-0">
                                  {assignees.slice(0, 3).map((assignee: any, idx: number) => (
                                    <div
                                      key={assignee._id}
                                      className={`w-7 h-7 rounded-full ${getAvatarColor(idx)} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white`}
                                      title={assignee.name}
                                    >
                                      {getInitials(assignee.name)}
                                    </div>
                                  ))}
                                  {assignees.length > 3 && (
                                    <div className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                                      +{assignees.length - 3}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-slate-400" /></span>
                              )}
                              <div className="flex items-center justify-center">
                                {typeIconMap[task.taskType || 'task'] ?? typeIconMap.task}
                              </div>
                              <div className="flex items-center justify-center">
                                {priorityIconMap[task.priority || 'low'] || priorityIconMap.low}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-grab"><GripVertical className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Backlog Section */}
            {(() => {
              const unassigned = backlogTasks.filter(t => !t.sprintId);
              const unassignedAllSelected = unassigned.length > 0 && unassigned.every(t => selectedBacklogIds.has(t._id));
              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                      <KanbanSquare className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Backlog</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                      <span className="text-xs font-bold text-slate-600">{unassigned.length}</span>
                      <span className="text-[10px] text-slate-400">items</span>
                    </div>
                    {sprints.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full">
                        <span className="text-xs font-bold text-indigo-600">{sprints.length}</span>
                        <span className="text-[10px] text-indigo-400">Sprint{sprints.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        let startDateStr = format(new Date(), 'yyyy-MM-dd');
                        if (sprints && sprints.length > 0) {
                          const sorted = [...sprints].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
                          const latest = sorted[0];
                          if (latest?.endDate) {
                            const d = new Date(latest.endDate);
                            d.setDate(d.getDate() + 1);
                            startDateStr = format(d, 'yyyy-MM-dd');
                          }
                        }
                        setSprintForm({
                          count: 1,
                          startDate: startDateStr,
                          durationWeeks: '2'
                        });
                        setShowCreateSprintModal(true);
                      }}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {sprints.length > 0 ? 'Add Sprint' : 'Create Sprint'}
                    </button>
                  </div>

                  <div 
                    className={`transition-all duration-200 min-h-[100px] ${
                      dragOverSprintId === 'unassigned' ? 'bg-indigo-50/30' : 'bg-white'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverSprintId('unassigned'); }}
                    onDragLeave={() => setDragOverSprintId(null)}
                    onDrop={(e) => handleDropTaskOnSprint(e, null)}
                  >
                    {/* Column headers for Backlog */}
                    {unassigned.length > 0 && (
                      <div className="grid grid-cols-[16px_96px_1fr_180px_28px_52px_20px_24px] items-center gap-3 px-5 py-2 border-b border-slate-100 bg-slate-50/50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          checked={unassignedAllSelected}
                          onChange={() => {
                            if (unassignedAllSelected) {
                              setSelectedBacklogIds(prev => { const n = new Set(prev); unassigned.forEach(t => n.delete(t._id)); return n; });
                            } else {
                              setSelectedBacklogIds(prev => { const n = new Set(prev); unassigned.forEach(t => n.add(t._id)); return n; });
                            }
                          }}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                        <span />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Who</span>
                        <span />
                        <span />
                        <span />
                      </div>
                    )}

                    {/* Unassigned backlog task rows */}
                    <div className="divide-y divide-slate-100">
                      {unassigned.length === 0 ? (
                        <div className="text-center py-14">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <KanbanSquare className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No items in backlog</p>
                          <p className="text-xs text-slate-400 mt-1">Items added to backlog will appear here</p>
                        </div>
                      ) : unassigned.map(task => {
                        const isSelected = selectedBacklogIds.has(task._id);
                        const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
                        const priorityIconMap: Record<string, React.ReactNode> = {
                          low: <ArrowUp className="w-3 h-3 text-slate-500" />,
                          medium: <Minus className="w-3 h-3 text-yellow-600" />,
                          high: <AlertTriangle className="w-3 h-3 text-orange-600" />,
                          critical: <AlertCircle className="w-3 h-3 text-red-600" />,
                        };
                        return (
                          <div
                            key={task._id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('taskId', task._id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            className={`grid grid-cols-[16px_96px_1fr_180px_28px_52px_20px_24px] items-center gap-3 px-5 py-2.5 transition-colors group cursor-grab active:cursor-grabbing ${
                              isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" checked={isSelected} onChange={() => toggleBacklogSelect(task._id)} />
                            <span className="text-xs font-mono text-slate-400 truncate">{task.taskNumber}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(task);
                              }}
                              className="text-left text-sm font-medium text-slate-800 truncate hover:text-indigo-600 transition-colors"
                            >
                              {task.title}
                            </button>
                            <div className="flex items-center gap-1">
                              {/* Status Badge (custom or column) */}
                              {(task as any).customStatus ? (
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${(task as any).customStatus.color}15`,
                                    color: (task as any).customStatus.color
                                  }}
                                >
                                  {(task as any).customStatus.name}
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: getStatusColor(task.status).bg,
                                    color: getStatusColor(task.status).text
                                  }}
                                >
                                  {getStatusLabel(task.status)}
                                </span>
                              )}
                              {/* Labels */}
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {task.labels.slice(0, 2).map((label: any) => (
                                    <span
                                      key={label._id}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                                    style={{ 
                                      backgroundColor: `${label.color}15`, 
                                      borderColor: `${label.color}35`, 
                                      color: label.color 
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                                {task.labels.length > 2 && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-200 text-slate-600">
                                    +{task.labels.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            </div>
                            <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                              task.status === 'to_do' ? 'bg-slate-100 text-slate-600' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                              task.status === 'in_review' ? 'bg-purple-100 text-purple-600' :
                              task.status === 'completed' ? 'bg-green-100 text-green-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {task.status === 'to_do' && <CheckCircle className="w-3.5 h-3.5" />}
                              {task.status === 'in_progress' && <Clock className="w-3.5 h-3.5" />}
                              {task.status === 'in_review' && <MessageSquare className="w-3.5 h-3.5" />}
                              {task.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                            </span>
                            {assignees.length > 0 ? (
                              <div className="flex -space-x-1.5 shrink-0">
                                {assignees.slice(0, 3).map((assignee: any, idx: number) => (
                                  <div
                                    key={assignee._id}
                                    className={`w-7 h-7 rounded-full ${getAvatarColor(idx)} text-white flex items-center justify-center text-[10px] font-bold border-2 border-white`}
                                    title={assignee.name}
                                  >
                                    {getInitials(assignee.name)}
                                  </div>
                                ))}
                                {assignees.length > 3 && (
                                  <div className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                                    +{assignees.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-slate-400" /></span>
                            )}
                            <div className="flex items-center justify-center">
                              {typeIconMap[task.taskType || 'task'] ?? typeIconMap.task}
                            </div>
                            <div className="flex items-center justify-center">
                              {priorityIconMap[task.priority || 'low'] || priorityIconMap.low}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-grab"><GripVertical className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Floating bulk action bar */}
            {someSelected && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-slate-900 text-white rounded-xl shadow-2xl px-3 py-2 text-xs border border-slate-700 animate-in slide-in-from-bottom-2 duration-200">
                <span className="px-2 py-1 bg-indigo-600 rounded-lg font-bold text-[11px] mr-1">
                  {selectedBacklogIds.size} selected
                </span>

                {/* Status */}
                <div className="relative group/s">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-slate-300" />
                    Status
                  </button>
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover/s:block bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[130px]">
                    {['to_do','in_progress','in_review','completed'].map(s => (
                      <button key={s} onClick={() => handleBulkUpdate({ status: s })} disabled={bulkUpdating}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium capitalize">
                        {statusLabels[s] || s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-700" />

                {/* Type */}
                <div className="relative group/t">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    <Layers className="w-3.5 h-3.5 text-slate-300" />
                    Type
                  </button>
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover/t:block bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[130px]">
                    {['task','story','bug','epic','subtask','improvement'].map(t => (
                      <button key={t} onClick={() => handleBulkUpdate({ taskType: t })} disabled={bulkUpdating}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium flex items-center gap-2">
                        {typeIconMap[t]}
                        {taskTypeLabels[t] || t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-700" />

                {/* Priority */}
                <div className="relative group/p">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                    Priority
                  </button>
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover/p:block bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[120px]">
                    {['low','medium','high','critical'].map(p => (
                      <button key={p} onClick={() => handleBulkUpdate({ priority: p })} disabled={bulkUpdating}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium capitalize">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-700" />

                {/* Assignee */}
                <div className="relative group/a">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                    Assign
                  </button>
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover/a:block bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[150px]">
                    <button onClick={() => handleBulkUpdate({ assignedTo: '' })} disabled={bulkUpdating}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium text-slate-400">
                      Unassign
                    </button>
                    {allMembers.map((m: any) => (
                      <button key={m._id} onClick={() => handleBulkUpdate({ assignedTo: m._id })} disabled={bulkUpdating}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                          {m.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-700" />

                {/* Due Date */}
                <div className="relative group/d">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-300" />
                    Due date
                  </button>
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover/d:flex bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 p-2">
                    <input
                      type="date"
                      className="text-[11px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700"
                      onChange={(e) => { if (e.target.value) handleBulkUpdate({ dueDate: e.target.value }); }}
                    />
                  </div>
                </div>

                <div className="w-px h-4 bg-slate-700" />

                {/* Move to Sprint */}
                {sprints.filter(s => s.status !== 'completed').length > 0 && (
                  <>
                    <div className="relative group/sp">
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        Sprint
                      </button>
                      <div className="absolute bottom-full mb-2 left-0 hidden group-hover/sp:block bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px]">
                        {sprints.filter(s => s.status !== 'completed').map(sp => (
                          <button key={sp._id} onClick={() => handleMoveToSprint(sp._id)} disabled={bulkUpdating}
                            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 font-medium flex items-center gap-2">
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{sp.sprintNumber}</span>
                            {sp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="w-px h-4 bg-slate-700" />
                  </>
                )}

                <button
                  onClick={() => setSelectedBacklogIds(new Set())}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })()}
      
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4">
            <p className="text-gray-500 text-sm">Timeline view coming soon...</p>
          </div>
        </div>
      )}
      
      {viewMode === 'docs' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4">
            <p className="text-gray-500 text-sm">Docs view coming soon...</p>
          </div>
        </div>
      )}

      {viewMode === 'rules' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* GitHub Repository Connector Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">GitHub Repository Connector</h2>
                  <p className="text-xs text-slate-400 font-medium">Link this project to a GitHub repository to auto-progress tasks from branch names</p>
                </div>
              </div>
              {project?.githubRepo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Linked</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConnectGithubRepo} className="space-y-4">
              <div className="max-w-xl">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  GitHub Repository Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={githubRepoInput}
                    onChange={(e) => setGithubRepoInput(e.target.value)}
                    placeholder="e.g. owner-name/repository-name"
                    className="flex-1 px-4 py-2 text-xs border border-slate-200 focus:border-indigo-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/10 text-slate-700 bg-white placeholder-slate-400 transition-all font-medium text-xs h-9"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isConnectingRepo}
                    className="bg-indigo-650 hover:bg-indigo-775 text-white font-semibold rounded-xl shrink-0 h-9"
                  >
                    {isConnectingRepo ? 'Connecting...' : 'Connect Repository'}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Enter the repository path from GitHub. Webhook event payloads should be directed to the endpoint below.
                </p>
              </div>

              {project?.githubRepo && (
                <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-4 space-y-2.5 text-xs max-w-2xl">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Webhook Installation Details</h4>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    To enable automatic status transitions, navigate to your GitHub Repository Settings ➔ Webhooks ➔ Add webhook and configure:
                  </p>
                  <div className="space-y-1.5 font-mono text-[10px] bg-white border border-slate-100 rounded-lg p-2.5 text-slate-655 shadow-inner">
                    <div className="flex"><span className="w-24 font-bold text-slate-400">Payload URL:</span> <span className="text-indigo-600 break-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/github` : '/api/webhooks/github'}</span></div>
                    <div className="flex"><span className="w-24 font-bold text-slate-400">Content Type:</span> <span>application/json</span></div>
                    <div className="flex"><span className="w-24 font-bold text-slate-400">Events:</span> <span>Branch or tag creation, Pushes</span></div>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Comment Automation Rules</h2>
                  <p className="text-xs text-slate-400 font-medium">Create automatic comment templates when tasks transition status</p>
                </div>
              </div>
            </div>

            {user?.role !== 'employee' && (
              <form onSubmit={handleSaveAutoCommentRule} className="space-y-4 bg-slate-50 border border-slate-150 rounded-2xl p-5 mb-8">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Create New Rule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From Status</label>
                    <select
                      value={autoRuleForm.fromStatus}
                      onChange={(e) => setAutoRuleForm({ ...autoRuleForm, fromStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="any">Any Status</option>
                      {columns.map(col => (
                        <option key={col.id} value={col.status}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Status</label>
                    <select
                      value={autoRuleForm.toStatus}
                      onChange={(e) => setAutoRuleForm({ ...autoRuleForm, toStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="any">Any Status</option>
                      {columns.map(col => (
                        <option key={col.id} value={col.status}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comment Template</label>
                    <span className="text-[10px] text-slate-400">Click to insert variables or mention members</span>
                  </div>

                  {/* Variable insertion tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { tag: '{{from_status}}', label: 'From Status' },
                      { tag: '{{to_status}}', label: 'To Status' },
                      { tag: '{{task_number}}', label: 'Task ID' },
                      { tag: '{{task_title}}', label: 'Title' },
                      { tag: '{{user_name}}', label: 'User Name' },
                      { tag: '{{assignee}}', label: '@Assignee' },
                    ].map(chip => (
                      <button
                        key={chip.tag}
                        type="button"
                        onClick={() => setAutoRuleForm(prev => ({ ...prev, template: prev.template + ' ' + chip.tag }))}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                      >
                        + {chip.tag}
                      </button>
                    ))}
                  </div>

                  {/* Member mention chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center">Quick mention:</span>
                    {projectMembersList.slice(0, 5).map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => setAutoRuleForm(prev => ({ ...prev, template: prev.template + ' @' + member.name }))}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                        title={`Click to mention @${member.name}`}
                      >
                        @{member.name}
                      </button>
                    ))}
                    {projectMembersList.length > 5 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center">+{projectMembersList.length - 5} more</span>
                    )}
                  </div>

                  <textarea
                    value={autoRuleForm.template}
                    onChange={(e) => setAutoRuleForm({ ...autoRuleForm, template: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono shadow-sm bg-white"
                    placeholder="e.g. Moved ticket {{task_number}} from {{from_status}} to {{to_status}} by {{user_name}}"
                    required
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Rule
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Configured Rules ({autoRules.length})</h3>
              {autoRules.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No automation rules configured for this project yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {autoRules.map((rule: any) => (
                    <div key={rule.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-300 transition-all shadow-sm">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <span className="bg-slate-100 border border-slate-200 text-slate-650 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {rule.fromStatus === 'any' ? 'Any Status' : columns.find(c => c.status === rule.fromStatus)?.name || rule.fromStatus}
                          </span>
                          <span className="text-slate-400">➔</span>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {rule.toStatus === 'any' ? 'Any Status' : columns.find(c => c.status === rule.toStatus)?.name || rule.toStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-2xl overflow-x-auto whitespace-pre-wrap">
                          {rule.template}
                        </p>
                        {rule.createdBy && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            Created by {rule.createdBy} on {new Date(rule.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {user?.role !== 'employee' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoRule(rule.id)}
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'ai-chat' && (
        <div className="flex-1 bg-[#FAF9FC] border border-slate-200/80 rounded-2xl flex flex-col h-[calc(100vh-180px)] shadow-[0_10px_30px_rgba(79,70,229,0.04)] overflow-hidden relative">
          {/* Glowing background orbs for visual depth */}
          <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-indigo-200/10 blur-[100px] pointer-events-none z-0" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-200/10 blur-[120px] pointer-events-none z-0" />

          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/70 backdrop-blur-md shrink-0 z-10 relative">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-150">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">NexusAI Workspace Assistant</h3>
                <p className="text-[10px] text-slate-400 font-medium">Agentic PM Chat interface with full access to project tasks</p>
              </div>
            </div>
            <button
              onClick={() => setChatMessages([
                { sender: 'ai', text: 'Hi! I am **NexusAI**, your agentic assistant. I can answer questions about your tasks or execute operations directly! Try commands like:\n- *\"Move TSK26070010 to in progress\"*\n- *\"Assign TSK26070012 to Tarun\"*\n- *\"Comment on TSK26070011 saying: looks good\"*', timestamp: new Date() }
              ])}
              className="text-slate-500 hover:text-indigo-650 px-3 py-1.5 rounded-xl hover:bg-slate-100/80 text-[10px] font-bold border border-slate-200/60 bg-white shadow-sm transition-all cursor-pointer"
              title="Clear conversation history"
            >
              Clear Chat History
            </button>
          </div>

          {/* Chat Messages / Welcome Dashboard */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-transparent font-sans z-10 relative">
            {chatMessages.length <= 1 ? (
              <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200/60 hover:scale-105 transition-all duration-300 relative group cursor-pointer">
                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
                    <Sparkles className="w-8 h-8 text-white relative z-10" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                      NexusAI Orchestration Center
                    </h2>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mt-1.5 mx-auto leading-relaxed">
                      Your intelligent agentic assistant. Instantly query databases, update status tags, assign owners, and command workflows.
                    </p>
                  </div>
                </div>

                {/* Quick Start Suggestions Grid */}
                <div className="grid grid-cols-2 gap-3.5 max-w-lg mx-auto">
                  {[
                    {
                      title: "List In Progress Tasks",
                      desc: "Shows what's actively being worked on",
                      query: "Give task id which assign to me and in in-progress",
                      icon: <List className="w-4 h-4 text-indigo-500" />
                    },
                    {
                      title: "High Priority Bugs",
                      desc: "Quick summary of critical issues",
                      query: "Show all bug tasks with high or critical priority",
                      icon: <Bug className="w-4 h-4 text-rose-500" />
                    },
                    {
                      title: "Update Task Status",
                      desc: "Move tasks and write status logs",
                      query: 'Move TSK26070010 to in_progress and comment "starting OAuth implementation" and mention Tarun',
                      icon: <CheckSquare className="w-4 h-4 text-emerald-500" />
                    },
                    {
                      title: "Assign Task Owner",
                      desc: "Change lead developers on tickets",
                      query: "Assign TSK26070012 to Tarun",
                      icon: <User className="w-4 h-4 text-amber-500" />
                    }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChatInput(item.query)}
                      className="p-4 bg-white/80 border border-slate-205 rounded-2xl text-left hover:border-indigo-300 hover:bg-white hover:shadow-md transition-all duration-200 group flex gap-3 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-bold text-slate-800 tracking-wide group-hover:text-indigo-750 transition-colors">{item.title}</h4>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className={`p-3.5 rounded-2xl text-xs relative group ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100/50 border border-indigo-700/10' 
                      : 'bg-white/95 text-slate-800 rounded-bl-none border border-slate-200 shadow-sm backdrop-blur-sm'
                  }`}>
                    {msg.sender === 'ai' ? (
                      <div className="space-y-1.5 pr-6 leading-relaxed">
                        {renderMarkdown(msg.text)}
                      </div>
                    ) : (
                      <p className="leading-relaxed">{msg.text}</p>
                    )}

                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => copyToClipboard(msg.text)}
                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1.5 px-1.5 font-medium">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 mr-auto max-w-[80%] p-3.5 bg-white text-slate-500 rounded-2xl rounded-bl-none border border-slate-200/60 text-xs shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                <span className="font-medium">NexusAI is orchestrating changes...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-md shrink-0 z-10 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question or type a command (e.g., 'Move TSK26070010 to in progress and assign to Tarun')..."
              disabled={chatLoading}
              className="flex-1 px-4 py-3 text-xs border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-2xl focus:outline-none text-slate-700 bg-white placeholder-slate-405 transition-all shadow-inner font-medium h-11"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer hover:scale-102"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateSprintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm animate-in scale-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">{sprints.length > 0 ? 'Add Sprint' : 'Create Sprint'}</h2>
              </div>
              <button onClick={() => setShowCreateSprintModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {sprints.length === 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Number of Sprints *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={sprintForm.count}
                    onChange={e => setSprintForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSprintCalendarOpen(v => !v)}
                    className={`w-full flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      sprintForm.startDate
                        ? 'border-indigo-400 text-slate-800'
                        : 'border-slate-200 text-slate-400'
                    } hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
                  >
                    <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    {sprintForm.startDate
                      ? format(new Date(sprintForm.startDate), 'MMM d, yyyy')
                      : 'Pick a start date'}
                  </button>
                  {sprintCalendarOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl">
                      <Calendar
                        mode={"single" as any}
                        selected={(sprintForm.startDate ? new Date(sprintForm.startDate) : undefined) as any}
                        onSelect={((date: Date | undefined) => {
                          if (date) {
                            setSprintForm(f => ({ ...f, startDate: format(date, 'yyyy-MM-dd') }));
                            setSprintCalendarOpen(false);
                          }
                        }) as any}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {['1','2','3','4'].map(w => (
                    <button
                      key={w}
                      onClick={() => setSprintForm(f => ({ ...f, durationWeeks: w }))}
                      className={`py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        sprintForm.durationWeeks === w
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-400'
                      }`}
                    >
                      {w}w
                    </button>
                  ))}
                </div>
                {sprintForm.startDate && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Ends {new Date(new Date(sprintForm.startDate).getTime() + Number(sprintForm.durationWeeks) * 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setShowCreateSprintModal(false)}
                className="flex-1 py-2 rounded-md border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSprint}
                disabled={creatingSprintLoading || sprintForm.count < 1 || !sprintForm.startDate}
                className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingSprintLoading ? 'Creating…' : (sprints.length > 0 ? 'Add Sprint' : 'Create Sprint')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Move Alert Modal */}
      {showSprintMoveAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md animate-in scale-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-800">Move to Next Sprint</h2>
              </div>
              <button onClick={() => setShowSprintMoveAlert(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">
                There are <span className="font-semibold text-slate-800">{previousSprintTasks.length} task(s)</span> in the previous sprint that haven't been completed. Would you like to move them to the current sprint?
              </p>
              <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto mb-4">
                {previousSprintTasks.slice(0, 5).map(task => (
                  <div key={task._id} className="text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                    {task.taskNumber} - {task.title}
                  </div>
                ))}
                {previousSprintTasks.length > 5 && (
                  <div className="text-xs text-slate-400 py-1">...and {previousSprintTasks.length - 5} more</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSprintMoveAlert(false)}
                  className="flex-1 py-2 rounded-md border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleMovePreviousSprintTasks}
                  disabled={bulkUpdating}
                  className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkUpdating ? 'Moving...' : 'Move Tasks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in scale-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Create New Task</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100/60 border border-transparent hover:border-slate-200 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTask({
                title: formData.get('title'),
                description: formData.get('description'),
                priority: formData.get('priority'),
                taskType: formData.get('taskType'),
                assignedTo: createTaskAssignees,
                startDate: formData.get('startDate') || undefined,
                dueDate: formData.get('dueDate') || undefined,
                storyPoints: formData.get('storyPoints') ? parseFloat(formData.get('storyPoints') as string) : undefined,
                estimatedHours: formData.get('estimatedHours') ? parseFloat(formData.get('estimatedHours') as string) : undefined,
                parentId: formData.get('parentId') || undefined,
                labels: selectedLabels,
                attachments: taskAttachments,
              });
              setSelectedLabels([]);
              setCreateTaskAssignees([]);
              setTaskAttachments([]);
            }} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Task Title *</label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-3.5 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-base transition-all font-semibold placeholder:text-slate-400 placeholder:font-medium text-slate-800"
                  placeholder="Describe the task objective..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  name="description"
                  className="w-full px-3.5 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all font-medium placeholder:text-slate-400 text-slate-800"
                  rows={5}
                  placeholder="Provide additional details or specifications..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Type</label>
                  <CustomSelect
                    name="taskType"
                    value={createTaskType}
                    onChange={(val) => setCreateTaskType(val)}
                    options={[
                      { value: "task", label: "Task", icon: <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> },
                      { value: "story", label: "Story", icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> },
                      { value: "bug", label: "Bug", icon: <Bug className="w-3.5 h-3.5 text-red-500" /> },
                      { value: "epic", label: "Epic", icon: <Zap className="w-3.5 h-3.5 text-purple-500" /> },
                      { value: "subtask", label: "Subtask", icon: <Layers className="w-3.5 h-3.5 text-slate-400" /> },
                      { value: "improvement", label: "Improvement", icon: <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> }
                    ]}
                    buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Priority</label>
                  <CustomSelect
                    name="priority"
                    value={createTaskPriority}
                    onChange={(val) => setCreateTaskPriority(val)}
                    options={[
                      { value: "low", label: "Low", icon: <Minus className="w-3.5 h-3.5 text-slate-400" /> },
                      { value: "medium", label: "Medium", icon: <Minus className="w-3.5 h-3.5 text-yellow-500" /> },
                      { value: "high", label: "High", icon: <ChevronUp className="w-3.5 h-3.5 text-orange-500" /> },
                      { value: "critical", label: "Critical", icon: <ArrowUp className="w-3.5 h-3.5 text-red-500" /> }
                    ]}
                    buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status</label>
                  <input
                    type="text"
                    value={statusLabels[createStatus]}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assignees</label>
                  {(() => {
                    const projectMembers: any[] = [];
                    if (project?.managerId) projectMembers.push(project.managerId);
                    project?.members?.forEach((m: any) => {
                      if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
                        projectMembers.push(m.employeeId);
                      }
                    });
                    const assigneeOptions = projectMembers.map((emp) => ({
                      value: emp._id,
                      label: emp.name,
                    }));
                    return (
                      <MultiSelect
                        name="assignedTo"
                        value={createTaskAssignees}
                        onChange={(values) => setCreateTaskAssignees(values)}
                        options={assigneeOptions}
                        placeholder="Select assignees..."
                        buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      />
                    );
                  })()}
                </div>

                {createTaskType === 'subtask' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Parent Task</label>
                    <CustomSelect
                      name="parentId"
                      value={createTaskParentId}
                      onChange={(val) => setCreateTaskParentId(val)}
                      options={[
                        { value: "", label: "None" },
                        ...[...tasks, ...backlogTasks]
                          .filter(t => t.taskType !== 'subtask')
                          .map((t) => ({
                            value: t._id,
                            label: `${t.taskNumber} - ${t.title}`
                          }))
                      ]}
                      buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    name="startDate"
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Story Points</label>
                  <input
                    name="storyPoints"
                    type="number"
                    min="0"
                    step="1"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-800"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Original Estimate (Hrs)</label>
                  <input
                    name="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs transition-all font-medium placeholder:text-slate-400 text-slate-800"
                    placeholder="e.g., 4"
                  />
                </div>
              </div>

              {/* Labels Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Labels</label>
                <div className="relative">
                  <input
                    type="text"
                    value={labelSearchQuery}
                    onChange={(e) => setLabelSearchQuery(e.target.value)}
                    placeholder="Search or create label..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                  {labelSearchQuery && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {filteredLabels.length > 0 ? (
                        filteredLabels.map((label) => {
                          const isSelected = selectedLabels.find(l => l._id === label._id);
                          return (
                            <button
                              key={label._id}
                              type="button"
                              onClick={() => {
                                setSelectedLabels(prev =>
                                  prev.find(l => l._id === label._id)
                                    ? prev.filter(l => l._id !== label._id)
                                    : [...prev, label]
                                );
                                setLabelSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className="text-slate-700">{label.name}</span>
                              </div>
                              {isSelected && <Check className="w-3 h-3 text-indigo-500" />}
                            </button>
                          );
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const newLabel = handleAddCustomLabel(labelSearchQuery);
                            if (newLabel) {
                              setSelectedLabels(prev => [...prev, newLabel]);
                            }
                            setLabelSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-indigo-600"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Create "{labelSearchQuery}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Labels Preview */}
                {selectedLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedLabels.map((label) => (
                      <span
                        key={label._id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1"
                        style={{ 
                          backgroundColor: `${label.color}15`, 
                          borderColor: `${label.color}35`, 
                          color: label.color 
                        }}
                      >
                        {label.name}
                        <button
                          type="button"
                          onClick={() => setSelectedLabels(prev => prev.filter(l => l._id !== label._id))}
                          className="hover:bg-black/10 rounded p-0.5 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Task
                </Button>
              </div>
            </form>
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
                <CustomSelect
                  value={formData.taskType || "task"}
                  onChange={(val) => setFormData({ ...formData, taskType: val })}
                  buttonClassName="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer transition-all w-36"
                  className="w-36 inline-block"
                  options={[
                    { value: "task",        icon: <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,   label: "Task" },
                    { value: "story",       icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,   label: "Story" },
                    { value: "bug",         icon: <Bug className="w-3.5 h-3.5 text-red-500" />,            label: "Bug" },
                    { value: "epic",        icon: <Zap className="w-3.5 h-3.5 text-purple-500" />,         label: "Epic" },
                    { value: "subtask",     icon: <Layers className="w-3.5 h-3.5 text-slate-400" />,       label: "Subtask" },
                    { value: "improvement", icon: <TrendingUp className="w-3.5 h-3.5 text-orange-400" />,  label: "Improvement" }
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteConfirmation("");
                  }}
                  className="text-slate-400 hover:text-red-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpdateTask();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                  title="Save changes"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLabels([]);
                    setTaskAttachments([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Left Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Title */}
                <div className="mb-6">
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
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs text-slate-800 transition-all resize-none min-h-[350px]"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Attachments */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Attachments</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                    <input
                      type="file"
                      id="task-file-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const uploaded = await handleFileUpload(file);
                          if (uploaded) {
                            setTaskAttachments([...taskAttachments, uploaded]);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="task-file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {uploadingFile ? 'Uploading...' : 'Click to upload files'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">Max 10MB</span>
                    </label>
                  </div>
                  {taskAttachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {taskAttachments.map((attachment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-700 truncate max-w-[200px]">{attachment.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPreviewAttachment(attachment)}
                              className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                              title="Preview"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTaskAttachments(taskAttachments.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachment Preview */}
                  {previewAttachment && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">Preview: {previewAttachment.name}</span>
                        <button
                          onClick={() => setPreviewAttachment(null)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                        {previewAttachment.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img
                            src={previewAttachment.url}
                            alt={previewAttachment.name}
                            className="max-h-64 w-full object-contain"
                          />
                        ) : previewAttachment.url.match(/\.(pdf)$/i) ? (
                          <div className="p-4 text-center">
                            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-600">PDF preview not available</p>
                            <a
                              href={previewAttachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                            >
                              Open in new tab
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-600">Preview not available for this file type</p>
                            <a
                              href={previewAttachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                            >
                              Open in new tab
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 mb-6">
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
                        {(() => {
                          const projectMembers: any[] = [];
                          if (project?.managerId) projectMembers.push(project.managerId);
                          project?.members?.forEach((m: any) => {
                            if (m.employeeId) projectMembers.push(m.employeeId);
                          });
                          const assigneeOptions = [
                            { value: "", label: "Assignee" },
                            ...projectMembers.map((emp) => ({
                              value: emp._id,
                              label: emp.name
                            }))
                          ];
                          return (
                            <CustomSelect
                              value={subtaskAssignee}
                              onChange={(val) => setSubtaskAssignee(val)}
                              options={assigneeOptions}
                              buttonClassName="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-100"
                            />
                          );
                        })()}
                        <CustomSelect
                          value={subtaskPriority}
                          onChange={(val) => setSubtaskPriority(val)}
                          options={[
                            { value: "low", label: "Low Priority" },
                            { value: "medium", label: "Medium Priority" },
                            { value: "high", label: "High Priority" },
                            { value: "critical", label: "Critical Priority" }
                          ]}
                          buttonClassName="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-100"
                        />
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
                            <span className="text-xs font-semibold text-slate-500">
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
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 mb-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Link2 className="w-4 h-4 text-indigo-500" />
                    Linked Issues
                  </h4>

                  {/* Add Link Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-white border border-slate-100 rounded-xl">
                    <CustomSelect
                      value={linkType}
                      onChange={(val) => setLinkType(val as any)}
                      options={[
                        { value: "dependsOn", label: "is blocked by" },
                        { value: "blocks", label: "blocks" },
                        { value: "relatesTo", label: "relates to" },
                        { value: "duplicates", label: "duplicates" },
                        { value: "isDuplicatedBy", label: "is duplicated by" }
                      ]}
                      buttonClassName="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-100"
                    />

                    <CustomSelect
                      value={linkTaskId}
                      onChange={(val) => setLinkTaskId(val)}
                      placeholder="Select issue to link..."
                      options={[
                        { value: "", label: "Select issue to link..." },
                        ...[...tasks, ...backlogTasks]
                          .filter(t => t._id !== selectedTask._id)
                          .map((t) => ({
                            value: t._id,
                            label: `${t.taskNumber} - ${t.title} (${t.status.replace('_', ' ')})`
                          }))
                      ]}
                      buttonClassName="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-100"
                    />

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

                    {/* Relates To links */}
                    {selectedTask.relatesTo && selectedTask.relatesTo.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">relates to</p>
                        {selectedTask.relatesTo.map((item: any, idx: number) => (
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
                                onClick={() => handleDeleteLink(item._id, 'relatesTo')}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Duplicates links */}
                    {selectedTask.duplicates && selectedTask.duplicates.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">duplicates</p>
                        {selectedTask.duplicates.map((item: any, idx: number) => (
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
                                onClick={() => handleDeleteLink(item._id, 'duplicates')}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Is Duplicated By links */}
                    {selectedTask.isDuplicatedBy && selectedTask.isDuplicatedBy.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">is duplicated by</p>
                        {selectedTask.isDuplicatedBy.map((item: any, idx: number) => (
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
                                onClick={() => handleDeleteLink(item._id, 'isDuplicatedBy')}
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
                     (!selectedTask.blocks || selectedTask.blocks.length === 0) &&
                     (!selectedTask.relatesTo || selectedTask.relatesTo.length === 0) &&
                     (!selectedTask.duplicates || selectedTask.duplicates.length === 0) &&
                     (!selectedTask.isDuplicatedBy || selectedTask.isDuplicatedBy.length === 0) && (
                      <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-xl">No linked issues yet</p>
                    )}
                  </div>
                </div>

                {/* Activity Section */}
                <div className="mb-6">
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
                                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">{renderCommentText(comment.text)}</p>
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {comment.attachments.map((attachment: any, aIdx: number) => (
                                      <a
                                        key={aIdx}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 transition-colors"
                                      >
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{attachment.name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
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
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="file"
                            id="comment-file-upload"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const uploaded = await handleFileUpload(file);
                                if (uploaded) {
                                  setCommentAttachments([...commentAttachments, uploaded]);
                                }
                              }
                              e.target.value = '';
                            }}
                          />
                          <label
                            htmlFor="comment-file-upload"
                            className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {uploadingFile ? 'Uploading...' : 'Attach file'}
                          </label>
                        </div>
                        {commentAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {commentAttachments.map((attachment, idx) => (
                              <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                <FileText className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] text-slate-700 truncate max-w-[100px]">{attachment.name}</span>
                                <button
                                  onClick={() => setCommentAttachments(commentAttachments.filter((_, i) => i !== idx))}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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
                                  {filteredMentionMembers.map((m) => (
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
                        <div className="flex items-center justify-between">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleOpenAutoCommentModal}
                            className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            Automate Comment Rule
                          </Button>
                          <Button size="sm" type="button" onClick={handleAddComment} disabled={!newComment.trim()}>
                            Save Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activityTab === 'history' && (
                    <div className="space-y-4">
                      {/* Filter */}
                      <div className="flex items-center gap-2">
                        <select
                          value={historyFilter}
                          onChange={(e) => setHistoryFilter(e.target.value)}
                          className="text-xs border border-slate-200 bg-white shadow-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold transition-all cursor-pointer hover:border-slate-300"
                        >
                          <option value="all">All Activity</option>
                          <option value="status_changed">Status Changes</option>
                          <option value="assignee_changed">Assignee Changes</option>
                          <option value="priority_changed">Priority Changes</option>
                          <option value="label_added">Label Added</option>
                          <option value="label_removed">Label Removed</option>
                          <option value="comment_added">Comments</option>
                          <option value="attachment_added">Attachments</option>
                        </select>
                      </div>

                      {/* Activity Logs (Timeline style) */}
                      <div className="space-y-0 max-h-[380px] overflow-y-auto pr-1 pl-1 py-1">
                        {activityLogs.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            No activity history yet
                          </div>
                        ) : (
                          activityLogs
                            .filter(log => historyFilter === 'all' || log.actionType === historyFilter || (historyFilter === 'status_changed' && (log.actionType === 'status_changed' || log.actionType === 'custom_status_changed')))
                            .map((log, idx, arr) => {
                              const initials = log.userName ? log.userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
                              const getInitialsBg = (val: string) => {
                                const list = [
                                  'bg-indigo-50 text-indigo-700 border-indigo-100',
                                  'bg-blue-50 text-blue-700 border-blue-100',
                                  'bg-emerald-50 text-emerald-700 border-emerald-100',
                                  'bg-amber-50 text-amber-700 border-amber-100',
                                  'bg-rose-50 text-rose-700 border-rose-100',
                                  'bg-violet-50 text-violet-700 border-violet-100'
                                ];
                                let h = 0;
                                for (let i = 0; i < val.length; i++) {
                                  h = val.charCodeAt(i) + ((h << 5) - h);
                                }
                                return list[Math.abs(h) % list.length];
                              };

                              return (
                                <div key={log._id} className="relative flex gap-3 pb-5 last:pb-0">
                                  {/* Timeline vertical connector */}
                                  {idx !== arr.length - 1 && (
                                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-100" />
                                  )}
                                  
                                  {/* User Initials Icon */}
                                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 shadow-sm z-10 ${getInitialsBg(log.userName || 'User')}`}>
                                    {initials}
                                  </div>

                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-xs font-bold text-slate-800 tracking-tight">{log.userName}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                                      {formatActivityDescription(log)}
                                    </p>
                                    

                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="w-80 border-l bg-white overflow-y-auto">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-end">
                  {isAutoSaving ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="p-5 pt-3 space-y-6">
                  {/* Status */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <CustomSelect
                      value={formData.customStatus ? `custom-${formData.customStatus.id}` : formData.status}
                      onChange={(val) => {
                        if (val.startsWith('custom-')) {
                          // Custom status selected - set as main status
                          const customStatusId = val.replace('custom-', '');
                          let targetColumn: any = null;
                          let targetCustomStatus: any = null;
                          project?.board?.columns?.forEach((col: any) => {
                            if (col.customStatuses) {
                              const found = col.customStatuses.find((s: any) => s.id === customStatusId);
                              if (found) {
                                targetColumn = col;
                                targetCustomStatus = found;
                              }
                            }
                          });
                          if (targetColumn && targetCustomStatus) {
                            setFormData(prev => ({
                              ...prev,
                              status: targetColumn.status,
                              customStatus: targetCustomStatus
                            }));
                          }
                        } else {
                          // Regular status selected - update main status
                          setFormData(prev => ({
                            ...prev,
                            status: val,
                            customStatus: null
                          }));
                        }
                      }}
                      options={[
                        { value: "backlog", label: "Backlog" },
                        { value: "to_do", label: "To Do" },
                        { value: "in_progress", label: "In Progress" },
                        { value: "in_review", label: "In Review" },
                        { value: "completed", label: "Completed" },
                        { value: "cancelled", label: "Cancelled" },
                        ...project?.board?.columns?.flatMap((col: any) =>
                          col.customStatuses?.map((s: any) => ({
                            value: `custom-${s.id}`,
                            label: s.name,
                            icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          })) || []
                        ) || []
                      ]}
                      buttonClassName="w-full px-3 py-2 border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
                    />
                  </div>

                  {/* Sprint Selector */}
                  {project?.useSprints && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sprint</label>
                      <CustomSelect
                        value={formData.sprintId}
                        onChange={(val) => setFormData({ ...formData, sprintId: val })}
                        options={[
                          { value: "", label: "No Sprint", icon: <Zap className="w-3.5 h-3.5 text-slate-400" /> },
                          ...sprints.map((sprint) => ({
                            value: sprint._id,
                            label: sprint.sprintNumber ? `${sprint.sprintNumber} (${sprint.name})` : sprint.name,
                            icon: <Zap className="w-3.5 h-3.5 text-indigo-500" />
                          }))
                        ]}
                        buttonClassName="w-full px-3 py-2 border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
                      />
                    </div>
                  )}

                  {/* Parent Task Selector */}
                  {formData.taskType === 'subtask' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Parent Task</label>
                      <CustomSelect
                        value={formData.parentId}
                        onChange={(val) => setFormData({ ...formData, parentId: val })}
                        options={[
                          { value: "", label: "None" },
                          ...[...tasks, ...backlogTasks]
                            .filter(t => t._id !== selectedTask._id && t.taskType !== 'subtask')
                            .map((t) => ({
                              value: t._id,
                              label: `${t.taskNumber} - ${t.title}`
                            }))
                        ]}
                        buttonClassName="w-full px-3 py-2 border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
                      />
                    </div>
                  )}

                  {/* Assignee */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assignees</label>
                    {(() => {
                      const projectMembers: any[] = [];
                      if (project?.managerId) projectMembers.push(project.managerId);
                      project?.members?.forEach((m: any) => {
                        if (m.employeeId && !projectMembers.some(pm => pm._id === m.employeeId._id)) {
                          projectMembers.push(m.employeeId);
                        }
                      });
                      
                      const assigneeOptions = projectMembers.map((emp) => ({
                        value: emp._id,
                        label: emp.name,
                      }));
                      
                      return (
                        <MultiSelect
                          value={formData.assignedTo}
                          onChange={(values) => setFormData({ ...formData, assignedTo: values })}
                          options={assigneeOptions}
                          placeholder="Select assignees..."
                          buttonClassName="w-full px-3 py-2 border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
                        />
                      );
                    })()}
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    {/* Priority */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                      <CustomSelect
                        value={formData.priority}
                        onChange={(val) => setFormData({ ...formData, priority: val })}
                        options={[
                          { value: "low",      icon: <Minus className="w-3.5 h-3.5 text-slate-400" />,          label: "Low" },
                          { value: "medium",   icon: <ChevronUp className="w-3.5 h-3.5 text-yellow-500" />,     label: "Medium" },
                          { value: "high",     icon: <ArrowUp className="w-3.5 h-3.5 text-orange-500" />,       label: "High" },
                          { value: "critical", icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,      label: "Critical" }
                        ]}
                        buttonClassName="w-full px-3 py-2 border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer hover:border-indigo-300 transition-colors"
                      />
                    </div>

                    {/* Labels */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Labels</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={labelSearchQuery}
                          onChange={(e) => setLabelSearchQuery(e.target.value)}
                          placeholder="Search or create label..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        />
                        {labelSearchQuery && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                            {filteredLabels.length > 0 ? (
                              filteredLabels.map((label) => {
                                const isSelected = selectedLabels.find(l => l._id === label._id);
                                return (
                                  <button
                                    key={label._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLabels(prev =>
                                        prev.find(l => l._id === label._id)
                                          ? prev.filter(l => l._id !== label._id)
                                          : [...prev, label]
                                      );
                                      setLabelSearchQuery('');
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: label.color }}
                                      />
                                      <span className="text-slate-700">{label.name}</span>
                                    </div>
                                    {isSelected && <Check className="w-3 h-3 text-indigo-500" />}
                                  </button>
                                );
                              })
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLabel = handleAddCustomLabel(labelSearchQuery);
                                  if (newLabel) {
                                    setSelectedLabels(prev => [...prev, newLabel]);
                                  }
                                  setLabelSearchQuery('');
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-indigo-600"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Create "{labelSearchQuery}"</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Labels Preview */}
                      {selectedLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {selectedLabels.map((label) => (
                            <span
                              key={label._id}
                              className="px-1.5 py-0.5 rounded text-[9.5px] font-bold border flex items-center gap-1"
                              style={{ 
                                backgroundColor: `${label.color}15`, 
                                borderColor: `${label.color}35`, 
                                color: label.color 
                              }}
                            >
                              {label.name}
                              <button
                                type="button"
                                onClick={() => setSelectedLabels(prev => prev.filter(l => l._id !== label._id))}
                                className="hover:bg-black/10 rounded p-0.5 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Story Points */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Story Points</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.storyPoints}
                        onChange={(e) => setFormData({ ...formData, storyPoints: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800 text-xs hover:border-indigo-300 transition-colors"
                        placeholder="e.g., 5"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800 text-xs hover:border-indigo-300 transition-colors"
                      />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due date</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800 text-xs hover:border-indigo-300 transition-colors"
                      />
                    </div>

                    {/* Estimated vs Actual Hours */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimate</label>
                        <input
                          type="number"
                          value={formData.estimatedHours}
                          onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                          min="0"
                          step="0.5"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800 text-xs hover:border-indigo-300 transition-colors"
                          placeholder="Hrs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actual</label>
                        <input
                          type="number"
                          value={formData.actualHours}
                          onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                          min="0"
                          step="0.5"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-800 text-xs hover:border-indigo-300 transition-colors"
                          placeholder="Hrs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    {/* Creator */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reporter</label>
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                          {selectedTask.createdBy?.name?.charAt(0).toUpperCase() || 'R'}
                        </div>
                        <span className="font-semibold text-slate-700 text-xs">{selectedTask.createdBy?.name || 'Unknown'}</span>
                      </div>
                    </div>

                    {/* Attachments */}
                    {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attachments</label>
                        <div className="space-y-1.5">
                          {selectedTask.attachments.map((attachment: any, idx: number) => (
                            <a
                              key={idx}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              <span className="text-[10px] text-slate-600 truncate flex-1 group-hover:text-indigo-700 transition-colors">{attachment.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Settings Modal */}
      {showColumnSettings && selectedColumn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-lg w-full animate-in scale-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Column Settings</h3>
                  <p className="text-sm text-slate-500">{selectedColumn.name}</p>
                </div>
                <button
                  onClick={() => setShowColumnSettings(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Custom Statuses */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Custom Statuses for {selectedColumn.name}
                  </label>
                  <button
                    onClick={() => {
                      const newStatus = {
                        id: "cs_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
                        name: 'New Status',
                        color: '#6B7280',
                        position: (selectedColumn.customStatuses?.length || 0)
                      };
                      setSelectedColumn({
                        ...selectedColumn,
                        customStatuses: [...(selectedColumn.customStatuses || []), newStatus]
                      });
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    + Add Status
                  </button>
                </div>

                {selectedColumn.customStatuses && selectedColumn.customStatuses.length > 0 ? (
                  <div className="space-y-2">
                    {selectedColumn.customStatuses.map((status: any, idx: number) => (
                      <div key={status.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                          type="color"
                          value={status.color}
                          onChange={(e) => {
                            const updatedStatuses = [...selectedColumn.customStatuses];
                            updatedStatuses[idx].color = e.target.value;
                            setSelectedColumn({ ...selectedColumn, customStatuses: updatedStatuses });
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={status.name}
                          onChange={(e) => {
                            const updatedStatuses = [...selectedColumn.customStatuses];
                            updatedStatuses[idx].name = e.target.value;
                            setSelectedColumn({ ...selectedColumn, customStatuses: updatedStatuses });
                          }}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          placeholder="Enter status name"
                        />
                        <button
                          onClick={() => {
                            const updatedStatuses = selectedColumn.customStatuses.filter((s: any) => s.id !== status.id);
                            setSelectedColumn({ ...selectedColumn, customStatuses: updatedStatuses });
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No custom statuses defined for {selectedColumn.name}</p>
                )}
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    try {
                      const updatedBoard = {
                        ...project?.board,
                        columns: project?.board?.columns?.map((col: any) =>
                          col.id === selectedColumn.id ? selectedColumn : col
                        )
                      };

                      const response = await fetch('/api/projects', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          projectId,
                          board: updatedBoard
                        }),
                      });

                      if (response.ok) {
                        addToast({ type: 'success', title: 'Success', description: 'Column settings saved' });
                        await fetchProject();
                        await fetchTasks();
                        await fetchBacklogTasks();
                        setShowColumnSettings(false);
                      } else {
                        throw new Error('Failed to save column settings');
                      }
                    } catch (error) {
                      addToast({ type: 'error', title: 'Error', description: 'Failed to save column settings' });
                    }
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-md w-full animate-in scale-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Task</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-slate-700 mb-4">
                  Are you sure you want to delete <span className="font-semibold">{selectedTask.title}</span>?
                </p>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type "delete" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type delete..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmation.toLowerCase() === 'delete') {
                      handleDeleteTask(selectedTask._id);
                      setShowDeleteModal(false);
                      setShowEditModal(false);
                      setSelectedLabels([]);
                      setTaskAttachments([]);
                      setDeleteConfirmation("");
                    }
                  }}
                  disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                  className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Status Selection Modal */}
      {showCustomStatusModal && selectedTaskForCustomStatus && targetColumnForCustomStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-md w-full animate-in scale-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Select Status</h2>
              <button
                onClick={() => {
                  setShowCustomStatusModal(false);
                  setSelectedTaskForCustomStatus(null);
                  setTargetColumnForCustomStatus(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100/60 border border-transparent hover:border-slate-200 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-4">
                Select a status for task <span className="font-bold text-slate-800">{selectedTaskForCustomStatus.taskNumber}</span>
              </p>
              {(() => {
                const column = project?.board?.columns?.find(col => col.status === targetColumnForCustomStatus);
                const hasCustomStatuses = column?.customStatuses && column.customStatuses.length > 0;
                
                return (
                  <div className="space-y-2">
                    {hasCustomStatuses ? (
                      <>
                        {column?.customStatuses?.map((customStatus: any) => (
                          <button
                            key={customStatus.id}
                            onClick={() => handleCustomStatusSelect(customStatus)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 text-left group"
                          >
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: customStatus.color }}
                            />
                            <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                              {customStatus.name}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => handleCustomStatusSelect(null)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-left group"
                        >
                          <div className="w-3 h-3 rounded-full shrink-0 bg-slate-200" />
                          <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                            No Status
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCustomStatusSelect(null)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 text-left group"
                      >
                        <div className="w-3 h-3 rounded-full shrink-0 bg-slate-200" />
                        <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                          {column?.name || 'Status'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Automate Comment Rule Modal */}
      {showAutoCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Automate Status Comment</h3>
                  <p className="text-xs text-slate-400">Trigger automatic comments when tickets move status</p>
                </div>
              </div>
              <button onClick={() => setShowAutoCommentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAutoCommentRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">From Status</label>
                  <select
                    value={autoRuleForm.fromStatus}
                    onChange={(e) => setAutoRuleForm({ ...autoRuleForm, fromStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 font-medium"
                  >
                    <option value="any">Any Status</option>
                    {columns.map(col => (
                      <option key={col.id} value={col.status}>{col.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">To Status</label>
                  <select
                    value={autoRuleForm.toStatus}
                    onChange={(e) => setAutoRuleForm({ ...autoRuleForm, toStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 font-medium"
                  >
                    <option value="any">Any Status</option>
                    {columns.map(col => (
                      <option key={col.id} value={col.status}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Comment Template</label>
                  <span className="text-[10px] text-slate-400">Click chips to insert variables</span>
                </div>

                {/* Variable Insertion Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { tag: '{{from_status}}', label: 'From Status' },
                    { tag: '{{to_status}}', label: 'To Status' },
                    { tag: '{{task_number}}', label: 'Task ID' },
                    { tag: '{{task_title}}', label: 'Title' },
                    { tag: '{{user_name}}', label: 'User Name' },
                    { tag: '{{assignee}}', label: '@Assignee' },
                  ].map(chip => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => setAutoRuleForm(prev => ({ ...prev, template: prev.template + ' ' + chip.tag }))}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-lg text-[10px] font-semibold transition-all"
                    >
                      + {chip.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={autoRuleForm.template}
                  onChange={(e) => setAutoRuleForm({ ...autoRuleForm, template: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  placeholder="Write rule template using {{variable}} placeholders..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAutoCommentModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Automation Rule
                </Button>
              </div>
            </form>

            {/* Existing Rules List */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Automation Rules</h4>
              {autoRules.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom rules configured yet.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {autoRules.map((rule: any) => (
                    <div key={rule.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                          <span className="bg-slate-200/80 px-1.5 py-0.5 rounded uppercase">{rule.fromStatus}</span>
                          <span>➔</span>
                          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">{rule.toStatus}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-mono line-clamp-2">{rule.template}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAutoRule(rule.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TransitionErrorPopup
        show={transitionError.show}
        message={transitionError.message}
        onClose={() => setTransitionError({ show: false, message: '' })}
      />
    </div>
  );
}
