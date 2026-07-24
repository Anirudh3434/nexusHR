"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  FolderKanban, Search, Filter, Clock, CheckCircle, XCircle, 
  Calendar, User, Plus, Edit, Trash2, MoreHorizontal, ChevronDown, ChevronUp,
  AlertCircle, TrendingUp, Users, DollarSign, LayoutGrid, List
} from "lucide-react";

interface ProjectMember {
  employeeId: { _id: string; name: string; email: string; department: string };
  role: string;
  joinedAt: string;
  allocationPercentage: number;
}

interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  status: string;
  completedAt?: string;
}

interface BoardColumn {
  id: string;
  name: string;
  status: string;
  color?: string;
  position: number;
  wipLimit?: number;
}

interface Board {
  id: string;
  name: string;
  type: 'kanban' | 'scrum' | 'list';
  columns: BoardColumn[];
  defaultView: 'board' | 'list' | 'timeline';
}

interface ProjectItem {
  _id: string;
  projectNumber: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  managerId: { _id: string; name: string; email: string; department: string };
  members: ProjectMember[];
  budget?: number;
  spent?: number;
  currency?: string;
  progressPercentage: number;
  milestones: Milestone[];
  board?: Board;
  useSprints: boolean;
  department?: string;
  clientName?: string;
  clientContact?: string;
  createdAt: string;
  createdBy: { name: string };
}

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const statusColors: Record<string, string> = {
  planning: 'bg-blue-50 text-blue-700 border border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  on_hold: 'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-50 text-slate-700 border border-slate-200',
  medium: 'bg-sky-50 text-sky-700 border border-sky-200',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  critical: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function ProjectsManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'USD',
    department: '',
    clientName: '',
    clientContact: '',
    useSprints: false,
    boardType: 'kanban',
    boardColumns: [
      { id: 'col-1', name: 'Backlog', status: 'backlog', color: '#6B7280', position: 0, wipLimit: null },
      { id: 'col-2', name: 'To Do', status: 'to_do', color: '#3B82F6', position: 1, wipLimit: null },
      { id: 'col-3', name: 'In Progress', status: 'in_progress', color: '#F59E0B', position: 2, wipLimit: 5 },
      { id: 'col-4', name: 'In Review', status: 'in_review', color: '#8B5CF6', position: 3, wipLimit: 3 },
      { id: 'col-5', name: 'Done', status: 'completed', color: '#10B981', position: 4, wipLimit: null },
    ],
  });

  const [departments, setDepartments] = useState<string[]>(['Engineering', 'Product', 'Marketing', 'Sales', 'Design', 'HR', 'Finance', 'Operations', 'General']);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((d: any) => d.name).filter(Boolean);
          setDepartments(prev => Array.from(new Set([...names, ...prev])));
        }
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchProjects();
    }
  }, [user?.companyId, filterStatus, filterPriority]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      
      const response = await fetch(`/api/projects?${params.toString()}`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load projects" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (projectId: string, status: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, status }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Project status updated" });
        fetchProjects();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update project status" });
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects?projectId=${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Project deleted" });
        fetchProjects();
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete project" });
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          board: {
            id: 'board-main',
            name: 'Main Board',
            type: formData.boardType,
            columns: formData.boardColumns,
            defaultView: 'board',
          },
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Project created" });
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          status: 'planning',
          priority: 'medium',
          startDate: '',
          endDate: '',
          budget: '',
          currency: 'USD',
          department: '',
          clientName: '',
          clientContact: '',
          useSprints: false,
          boardType: 'kanban',
          boardColumns: [
            { id: 'col-1', name: 'Backlog', status: 'backlog', color: '#6B7280', position: 0, wipLimit: null },
            { id: 'col-2', name: 'To Do', status: 'to_do', color: '#3B82F6', position: 1, wipLimit: null },
            { id: 'col-3', name: 'In Progress', status: 'in_progress', color: '#F59E0B', position: 2, wipLimit: 5 },
            { id: 'col-4', name: 'In Review', status: 'in_review', color: '#8B5CF6', position: 3, wipLimit: 3 },
            { id: 'col-5', name: 'Done', status: 'completed', color: '#10B981', position: 4, wipLimit: null },
          ],
        });
        fetchProjects();
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to create project" });
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderMemberAvatars = (members: ProjectMember[]) => {
    if (!members || members.length === 0) return <span className="text-slate-400 text-xs italic">No members</span>;
    
    const displayLimit = 4;
    const displayMembers = members.slice(0, displayLimit);
    const remainingCount = members.length - displayLimit;
  
    const getAvatarBg = (name: string) => {
      const colors = [
        'bg-indigo-50 text-indigo-700 border-indigo-200',
        'bg-emerald-50 text-emerald-700 border-emerald-200',
        'bg-sky-50 text-sky-700 border-sky-200',
        'bg-amber-50 text-amber-700 border-amber-200',
        'bg-rose-50 text-rose-700 border-rose-200',
        'bg-violet-50 text-violet-700 border-violet-200',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };
  
    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };
  
    return (
      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
        {displayMembers.map((member, idx) => {
          const name = member.employeeId?.name || 'Member';
          const initials = getInitials(name);
          const bgClass = getAvatarBg(name);
          return (
            <div
              key={idx}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold border-2 border-white ring-1 ring-black/5 shadow-sm ${bgClass}`}
              title={`${name} (${member.role})`}
            >
              {initials}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border-2 border-white ring-1 ring-black/5 shadow-sm"
            title={`${remainingCount} more members`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500">Manage and track your company projects</p>
        </div>
        {user?.role !== 'employee' && (
          <Button onClick={() => window.location.href = '/projects/create'} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition-all duration-300 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Projects</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{totalProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center text-indigo-600 border border-indigo-100/30">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition-all duration-300 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{activeProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 border border-emerald-100/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition-all duration-300 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{completedProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center text-indigo-600 border border-indigo-100/30">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition-all duration-300 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spent / Budget</p>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate max-w-[150px]">
                ${totalSpent.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">/ ${totalBudget.toLocaleString()}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50/80 flex items-center justify-center text-amber-600 border border-amber-100/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by project name, code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer text-slate-600 font-medium"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3.5 py-2 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm cursor-pointer text-slate-600 font-medium"
              >
                <option value="">All Priorities</option>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Container */}
      {filteredProjects.length === 0 ? (
        <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="max-w-xs mx-auto space-y-3">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-700">No Projects Found</h3>
              <p className="text-xs text-slate-400">We couldn't find any projects matching your search criteria or filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const priorityAccent: Record<string, string> = {
              low: 'border-t-slate-400',
              medium: 'border-t-sky-500',
              high: 'border-t-orange-500',
              critical: 'border-t-rose-500',
            };

            const isExpanded = expandedId === project._id;

            return (
              <Card 
                key={project._id} 
                className={`border border-slate-100 hover:border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.045)] transition-all duration-300 hover:-translate-y-1 overflow-hidden border-t-4 ${priorityAccent[project.priority] || 'border-t-slate-300'} rounded-2xl bg-white`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  {/* Top: Badges and Actions */}
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      {project.projectNumber}
                    </span>
                    {user?.role !== 'employee' && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/projects/create?id=${project._id}`}
                          className="w-7 h-7 p-0 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          title="Edit Project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {project.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(project._id, 'completed')}
                            className="w-7 h-7 p-0 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-700"
                            title="Mark Completed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        ) : ['planning', 'on_hold', 'cancelled'].includes(project.status) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(project._id, 'active')}
                            className="w-7 h-7 p-0 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-700"
                            title="Activate Project"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project._id)}
                          className="w-7 h-7 p-0 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Title and Badges */}
                  <div>
                    <h3 
                      className="font-bold text-slate-800 text-base mb-2 hover:text-indigo-600 transition-colors cursor-pointer" 
                      onClick={() => { 
                        if (user?.role === 'employee') {
                          window.location.href = `/projects/${project._id}/board`;
                        } else {
                          setSelectedProject(project); 
                          setShowViewModal(true); 
                        }
                      }}
                    >
                      {project.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                      </Badge>
                      <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${priorityColors[project.priority]}`}>
                        {priorityLabels[project.priority]}
                      </Badge>
                      {project.department && (
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 px-2.5 py-0.5 rounded-full">
                          {project.department}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-8">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-slate-100 pt-3.5">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={project.managerId?.name || 'Not assigned'}>
                        PM: <strong className="text-slate-700 font-semibold">{project.managerId?.name || 'Unassigned'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-600">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'No date'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="shrink-0 mr-1">Team:</span>
                      {renderMemberAvatars(project.members)}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                      {project.board && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-600 capitalize">
                          {project.board.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Budget Meter (if applicable) */}
                  {project.budget !== undefined && project.budget > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-50">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Spent: ${project.spent?.toLocaleString() || 0}</span>
                        <span>Budget: ${project.budget.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            (project.spent || 0) / project.budget > 0.9 ? 'bg-rose-500' : (project.spent || 0) / project.budget > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(((project.spent || 0) / project.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Progress Section */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Task Progress</span>
                      <span className="font-bold text-slate-800">{project.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${
                          project.status === 'completed' ? 'from-emerald-400 to-teal-500' : 'from-indigo-500 to-indigo-600'
                        }`}
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer / Expand Button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : project._id)}
                    className="w-full py-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center justify-center gap-1 border border-indigo-100/20"
                  >
                    {isExpanded ? (
                      <>
                        Hide Details
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        View Assignments & Milestones
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="pt-3.5 border-t border-slate-100 space-y-3.5 text-xs animate-in fade-in duration-200">
                      <div>
                        <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Members Assignments
                        </h4>
                        <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                          {project.members && project.members.length > 0 ? (
                            project.members.map((member, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100/80 transition-colors">
                                <span className="font-semibold text-slate-700 truncate max-w-[120px]">{member.employeeId?.name || 'Unknown'}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 truncate capitalize font-medium">{member.role.replace('_', ' ')}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">No assigned team members.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                          Key Milestones
                        </h4>
                        <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                          {project.milestones && project.milestones.length > 0 ? (
                            project.milestones.map((milestone) => (
                              <div key={milestone.id} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100/80 transition-colors">
                                <span className="font-semibold text-slate-700 truncate max-w-[120px]" title={milestone.name}>{milestone.name}</span>
                                <Badge variant="outline" className={`text-[9px] px-2 py-0 capitalize font-medium ${
                                  milestone.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  milestone.status === 'overdue' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  milestone.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {milestone.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">No milestones defined.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <th className="p-4">Project</th>
                    <th className="p-4">Manager</th>
                    <th className="p-4">Timeline</th>
                    <th className="p-4">Team</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr key={project._id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => { setSelectedProject(project); setShowViewModal(true); }}>
                            {project.name}
                          </span>
                          <span className="text-[10px] text-slate-400 tracking-wider uppercase mt-0.5">
                            {project.projectNumber}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {project.managerId?.name || 'Unassigned'}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-medium">
                        {project.startDate && project.endDate ? (
                          <span>{new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="p-4">
                        {renderMemberAvatars(project.members)}
                      </td>
                      <td className="p-4 w-44">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${project.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{project.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = `/projects/create?id=${project._id}`}
                            className="w-7 h-7 p-0 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project._id)}
                            className="w-7 h-7 p-0 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Create New Project</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Budget</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                >
                  <option value="">Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Client Contact</label>
                  <input
                    type="text"
                    value={formData.clientContact}
                    onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Agile/Board Configuration */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Agile Configuration</h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="useSprints"
                    checked={formData.useSprints}
                    onChange={(e) => setFormData({ ...formData, useSprints: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="useSprints" className="text-sm font-medium">Use Sprints (Scrum)</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Board Type</label>
                  <select
                    value={formData.boardType}
                    onChange={(e) => setFormData({ ...formData, boardType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kanban">Kanban</option>
                    <option value="scrum">Scrum</option>
                    <option value="list">List</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Board Columns</label>
                  <div className="space-y-2">
                    {formData.boardColumns.map((column, idx) => (
                      <div key={column.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: column.color }} />
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => {
                            const newColumns = [...formData.boardColumns];
                            newColumns[idx] = { ...newColumns[idx], name: e.target.value };
                            setFormData({ ...formData, boardColumns: newColumns });
                          }}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="WIP Limit"
                          value={column.wipLimit || ''}
                          onChange={(e) => {
                            const newColumns = [...formData.boardColumns];
                            newColumns[idx] = { ...newColumns[idx], wipLimit: e.target.value ? parseInt(e.target.value) : null };
                            setFormData({ ...formData, boardColumns: newColumns });
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="color"
                          value={column.color}
                          onChange={(e) => {
                            const newColumns = [...formData.boardColumns];
                            newColumns[idx] = { ...newColumns[idx], color: e.target.value };
                            setFormData({ ...formData, boardColumns: newColumns });
                          }}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newColumn = {
                        id: `col-${formData.boardColumns.length + 1}`,
                        name: 'New Column',
                        status: `status_${formData.boardColumns.length}`,
                        color: '#3B82F6',
                        position: formData.boardColumns.length,
                        wipLimit: null,
                      };
                      setFormData({ ...formData, boardColumns: [...formData.boardColumns, newColumn] });
                    }}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Project Modal */}
      {showViewModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Project Details</h2>
              <p className="text-sm text-gray-600">{selectedProject.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Number</label>
                <p className="text-gray-700">{selectedProject.projectNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <p className="text-gray-700">{selectedProject.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Badge className={statusColors[selectedProject.status]}>
                    {statusLabels[selectedProject.status]}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Badge className={priorityColors[selectedProject.priority]}>
                    {priorityLabels[selectedProject.priority]}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <p className="text-gray-700">{new Date(selectedProject.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <p className="text-gray-700">{new Date(selectedProject.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedProject.budget && (
                <div>
                  <label className="block text-sm font-medium mb-1">Budget</label>
                  <p className="text-gray-700">{selectedProject.currency || 'USD'} {selectedProject.budget.toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Progress</label>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${selectedProject.progressPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{selectedProject.progressPercentage}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Manager</label>
                <p className="text-gray-700">{selectedProject.managerId.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Team Members ({selectedProject.members.length})</label>
                <div className="space-y-2 mt-2">
                  {selectedProject.members.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{member.employeeId.name}</span>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              {selectedProject.milestones.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Milestones ({selectedProject.milestones.length})</label>
                  <div className="space-y-2 mt-2">
                    {selectedProject.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{milestone.name}</span>
                        <Badge variant="outline">{milestone.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end">
              <Button onClick={() => setShowViewModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
