"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft, Plus, Trash2, Settings, Layers, Layout,
  KanbanSquare, CheckCircle, Clock, AlertCircle, Info,
  Search, Check, Users, User, GripVertical
} from "lucide-react";
import { useSearchParams } from 'next/navigation';
import StatusTransitionFlow from "@/components/projects/StatusTransitionFlow";

interface BoardColumn {
  id: string;
  name: string;
  status: string;
  color: string;
  position: number;
  wipLimit: number | null;
  isDefault: boolean;
  allowedTransitions?: string[];
  requiredFields?: string[];
  autoAssign?: string;
  slaHours?: number;
}

const predefinedColumns: BoardColumn[] = [
  { id: 'backlog', name: 'Backlog', status: 'backlog', color: '#6B7280', position: 0, wipLimit: null, isDefault: true },
  { id: 'todo', name: 'To Do', status: 'to_do', color: '#3B82F6', position: 1, wipLimit: null, isDefault: true },
  { id: 'inprogress', name: 'In Progress', status: 'in_progress', color: '#F59E0B', position: 2, wipLimit: 5, isDefault: true },
  { id: 'review', name: 'In Review', status: 'in_review', color: '#8B5CF6', position: 3, wipLimit: 3, isDefault: true },
  { id: 'done', name: 'Done', status: 'completed', color: '#10B981', position: 4, wipLimit: null, isDefault: true },
];

export default function CreateProjectPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const isEditMode = !!projectId;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    department: '',
    clientName: '',
    useSprints: false,
    boardType: 'kanban',
    columns: [...predefinedColumns],
  });

  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === index) return;

    const updated = [...formData.columns];
    const [draggedItem] = updated.splice(draggedColumnIndex, 1);
    updated.splice(index, 0, draggedItem);

    const reindexed = updated.map((col, idx) => ({ ...col, position: idx }));
    setFormData(prev => ({ ...prev, columns: reindexed }));
    setDraggedColumnIndex(index);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
  };
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
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
      // fallback to default list
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchEmployees();
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoadingProject(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.project) {
        const project = data.project;
        setFormData({
          name: project.name || '',
          description: project.description || '',
          status: project.status || 'planning',
          priority: project.priority || 'medium',
          department: project.department || '',
          clientName: project.clientName || '',
          useSprints: project.useSprints || false,
          boardType: project.board?.type || 'kanban',
          columns: project.board?.columns || [...predefinedColumns],
        });

        setSelectedEmployees(
          project.members?.map((m: any) => m.employeeId._id || m.employeeId) || []
        );
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      addToast({ type: "error", title: "Error", description: "Failed to load project" });
    } finally {
      setLoadingProject(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await fetch(`/api/users?companyId=${user?.companyId}`);
      const data = await response.json();
      setEmployees(data.users || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      addToast({ type: "error", title: "Error", description: "Project name is required" });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreateProject = async () => {
    try {
      const payload = {
        ...formData,
        companyId: user?.companyId,
        managerId: (user as any)?._id,
        members: selectedEmployees.map(empId => ({
          employeeId: empId,
          role: 'developer',
          joinedAt: new Date().toISOString(),
          allocationPercentage: 100,
        })),
        board: {
          id: 'board-main',
          name: 'Main Board',
          type: formData.boardType,
          columns: formData.columns,
          defaultView: 'board',
        },
      };

      const response = await fetch(
        isEditMode ? '/api/projects' : '/api/projects',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isEditMode
              ? { ...payload, projectId }
              : { ...payload, createdBy: (user as any)?._id }
          ),
        }
      );

      if (response.ok) {
        addToast({
          type: "success",
          title: "Success",
          description: isEditMode ? "Project updated successfully" : "Project created successfully"
        });
        window.location.href = '/projects';
      } else {
        throw new Error(isEditMode ? 'Failed to update project' : 'Failed to create project');
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        description: isEditMode ? "Failed to update project" : "Failed to create project"
      });
    }
  };

  const addCustomColumn = () => {
    // Generate proper UUID-like IDs for custom columns
    const generateId = () => {
      return 'col_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    };
    
    const newColumn: BoardColumn = {
      id: generateId(),
      name: 'New Status',
      status: generateId(),
      color: '#3B82F6',
      position: formData.columns.length,
      wipLimit: null,
      isDefault: false,
    };
    setFormData({ ...formData, columns: [...formData.columns, newColumn] });
  };

  const updateColumn = (id: string, field: keyof BoardColumn, value: any) => {
    setFormData({
      ...formData,
      columns: formData.columns.map(col => {
        if (col.id !== id) return col;
        const updated = { ...col, [field]: value };
        if (field === 'name' && !col.isDefault) {
          const slug = String(value).toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          if (slug) {
            updated.status = slug;
          }
        }
        return updated;
      })
    });
  };

  const removeColumn = (id: string) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter(col => col.id !== id)
    });
  };

  const handleTransitionChange = (fromStatus: string, toStatus: string, allowed: boolean) => {
    const updatedColumns = formData.columns.map(col => {
      if (col.status === fromStatus || col.id === fromStatus) {
        const currentTransitions = col.allowedTransitions || [];
        let newTransitions: string[];
        
        if (allowed) {
          newTransitions = currentTransitions.includes(toStatus) 
            ? currentTransitions 
            : [...currentTransitions, toStatus];
        } else {
          newTransitions = currentTransitions.filter(s => s !== toStatus);
        }
        
        return { ...col, allowedTransitions: newTransitions };
      }
      return col;
    });
    setFormData(prev => ({ ...prev, columns: updatedColumns }));
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-slate-50/50 overflow-hidden">
      {/* Container 1: Top Header Toolbar */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm px-6 py-4 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/projects'}
                className="flex items-center justify-center w-9 h-9 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl text-slate-500 hover:text-slate-800 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                  {isEditMode ? 'Edit Project' : 'Create New Project'}
                </h1>
                <p className="text-xs text-slate-400">
                  {isEditMode ? 'Update project configuration' : 'Set up your project workspace'}
                </p>
              </div>
            </div>

            {/* Custom Stepper */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100/80 border border-slate-200/20 p-1.5 rounded-2xl gap-1">
                {[
                  { num: 1, label: 'Basic Info' },
                  { num: 2, label: 'Board Config' },
                  { num: 3, label: 'Board Columns' },
                  { num: 4, label: 'Review & Save' },
                ].map((item, idx) => {
                  const isActive = step === item.num;
                  const isCompleted = step > item.num;
                  return (
                    <div key={item.num} className="flex items-center">
                      <div
                        onClick={() => {
                          if (isEditMode || isCompleted || item.num < step) {
                            setStep(item.num);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                          isEditMode || isCompleted || item.num < step ? 'cursor-pointer hover:opacity-90' : ''
                        } ${isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10 border border-indigo-500/20 scale-105'
                          : isCompleted
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/40'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white text-indigo-600' : isCompleted ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                          {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : item.num}
                        </div>
                        <span className="hidden sm:inline">{item.label}</span>
                      </div>
                      {idx < 3 && (
                        <div className="w-4 h-px bg-slate-200 mx-1 hidden sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Container 2: Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto pb-12">
        {loadingProject ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs text-slate-400 font-medium">Loading project specifications...</p>
          </div>
        ) : (
          <>
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="w-full space-y-6">
                <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-5">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Info className="w-4.5 h-4.5 text-indigo-600" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Project Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all placeholder:text-slate-400"
                        placeholder="e.g., Nexus AI Redesign"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all placeholder:text-slate-400"
                        rows={4}
                        placeholder="Outline the core objectives, deliverables, and targets for this project..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all text-slate-700 cursor-pointer"
                        >
                          <option value="planning">Planning</option>
                          <option value="active">Active</option>
                          <option value="on_hold">On Hold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Priority</label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all text-slate-700 cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Department</label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all text-slate-700 font-medium"
                        >
                          <option value="">Select Department...</option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Client Name</label>
                        <input
                          type="text"
                          value={formData.clientName}
                          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all placeholder:text-slate-400"
                          placeholder="Optional client or sponsor reference"
                        />
                      </div>
                    </div>

                    {/* Assign Collaborators */}
                    <div className="border-t border-slate-100 pt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Team Members</label>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                          <input
                            type="text"
                            placeholder="Search employees..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {loadingEmployees ? (
                        <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                          Loading employees...
                        </div>
                      ) : (
                        <div className="border border-slate-100 rounded-2xl p-3 max-h-56 overflow-y-auto space-y-1.5 bg-slate-50/20">
                          {filteredEmployees.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 italic">No employees found.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {filteredEmployees.map((employee) => {
                                const isSelected = selectedEmployees.includes(employee._id);

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

                                const avatarBg = getAvatarBg(employee.name);
                                const initials = getInitials(employee.name);

                                return (
                                  <div
                                    key={employee._id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedEmployees(selectedEmployees.filter(id => id !== employee._id));
                                      } else {
                                        setSelectedEmployees([...selectedEmployees, employee._id]);
                                      }
                                    }}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                                      ? 'border-indigo-500 bg-indigo-50/30 shadow-sm'
                                      : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300'
                                      }`}
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${avatarBg} shrink-0`}>
                                      {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-slate-800 truncate">{employee.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{employee.email}</div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {employee.department && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-200 text-slate-500 capitalize shrink-0 font-medium">
                                          {employee.department}
                                        </Badge>
                                      )}
                                      <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-350 bg-white'
                                        }`}>
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedEmployees.length > 0 && (
                        <div className="mt-2.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-lg inline-block border border-indigo-100/30">
                          {selectedEmployees.length} member{selectedEmployees.length !== 1 ? 's' : ''} assigned to project
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => window.location.href = '/projects'} className="rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 font-medium">
                    Cancel
                  </Button>
                  <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-semibold px-5">
                    Next: Board Configuration
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Board Configuration */}
            {step === 2 && (
              <div className="w-full space-y-6">
                <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-5">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Layout className="w-4.5 h-4.5 text-indigo-600" />
                      Board Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Board Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Board Type</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { value: 'kanban', icon: KanbanSquare, label: 'Kanban', desc: 'Continuous flow with WIP limits' },
                          { value: 'scrum', icon: Layers, label: 'Scrum', desc: 'Sprint-based planning methodology' },
                          { value: 'list', icon: Layout, label: 'List', desc: 'Simple tabular task index view' },
                        ].map((type) => {
                          const isSelected = formData.boardType === type.value;
                          return (
                            <div
                              key={type.value}
                              onClick={() => setFormData({ ...formData, boardType: type.value as any })}
                              className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${isSelected
                                ? 'border-indigo-500 bg-indigo-50/30 shadow-md shadow-indigo-500/5'
                                : 'border-slate-200/80 bg-white hover:border-slate-350 hover:bg-slate-50/50'
                                }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                <type.icon className="w-4.5 h-4.5" />
                              </div>
                              <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>{type.label}</h3>
                              <p className="text-xs text-slate-500 leading-relaxed">{type.desc}</p>

                              {isSelected && (
                                <div className="absolute top-3 right-3 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sprint Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">Enable Sprints (Scrum)</h3>
                        <p className="text-xs text-slate-400">Implement dynamic sprint cycles, backlogs, and velocity tracking.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.useSprints}
                          onChange={(e) => setFormData({ ...formData, useSprints: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={handleBack} className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-semibold px-5">
                    Next: Board Columns
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Board Columns */}
            {step === 3 && (
              <div className="w-full space-y-6">
                <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-5 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <KanbanSquare className="w-4.5 h-4.5 text-indigo-600" />
                        Board Columns Configuration
                      </CardTitle>
                      <p className="text-[11px] text-slate-400 mt-1">Manage columns, WIP limits, transition rules, and drag handles to reorder.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={addCustomColumn} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-lg text-xs font-semibold">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Custom Status
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3 min-h-[300px]">
                      {formData.columns.map((column, index) => (
                        <div 
                          key={column.id} 
                          draggable
                          onDragStart={(e) => handleColumnDragStart(e, index)}
                          onDragOver={(e) => handleColumnDragOver(e, index)}
                          onDragEnd={handleColumnDragEnd}
                          className={`p-4 border rounded-2xl bg-white shadow-sm transition-all ${
                            draggedColumnIndex === index ? 'border-indigo-400 bg-indigo-50/20 opacity-60' : 'border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-2 text-slate-350 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
                            <div className="flex-1 space-y-3.5">
                              <div className="flex items-center gap-3">
                                <input
                                  type="text"
                                  value={column.name}
                                  onChange={(e) => updateColumn(column.id, 'name', e.target.value)}
                                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                  placeholder="Status Name"
                                />
                                <input
                                  type="color"
                                  value={column.color}
                                  onChange={(e) => updateColumn(column.id, 'color', e.target.value)}
                                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 shrink-0 p-0.5"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedColumn(expandedColumn === column.id ? null : column.id)}
                                  className={`w-8 h-8 p-0 rounded-lg ${expandedColumn === column.id ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                                  title="Advanced Rules"
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                                {!column.isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeColumn(column.id)}
                                    className="w-8 h-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete Column"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <input
                                    type="number"
                                    placeholder="None"
                                    value={column.wipLimit || ''}
                                    onChange={(e) => updateColumn(column.id, 'wipLimit', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-16 px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-medium text-slate-700"
                                  />
                                  <span className="text-slate-400">WIP limit tickets</span>
                                </div>
                                {column.isDefault && (
                                  <Badge variant="outline" className="text-[10px] font-semibold text-slate-400 border-slate-200 px-2 py-0.5 rounded-full">Default</Badge>
                                )}
                              </div>

                              {/* Advanced Settings */}
                              {expandedColumn === column.id && (
                                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200 text-xs">
                                  <h4 className="font-bold text-slate-800">Advanced Transition & Transition Rules</h4>

                                  <div>
                                    <label className="block text-slate-600 font-semibold mb-1">Target SLA Threshold (hours)</label>
                                    <input
                                      type="number"
                                      placeholder="e.g., 24"
                                      value={column.slaHours || ''}
                                      onChange={(e) => updateColumn(column.id, 'slaHours', e.target.value ? parseInt(e.target.value) : undefined)}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Automatic alert warning threshold after a ticket remains in this status.</p>
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 font-semibold mb-1.5">Allowed Inbound Transitions</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {formData.columns.filter(c => c.id !== column.id).map((col) => {
                                        const isChecked = column.allowedTransitions?.includes(col.id) || false;
                                        return (
                                          <label key={col.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                            }`}>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                const current = column.allowedTransitions || [];
                                                const updated = e.target.checked
                                                  ? [...current, col.id]
                                                  : current.filter(id => id !== col.id);
                                                updateColumn(column.id, 'allowedTransitions', updated);
                                              }}
                                              className="sr-only"
                                            />
                                            {col.name}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 font-semibold mb-1.5">Required Submission Fields</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {['description', 'assignee', 'priority', 'storyPoints'].map((field) => {
                                        const isChecked = column.requiredFields?.includes(field) || false;
                                        return (
                                          <label key={field} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                            }`}>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                const current = column.requiredFields || [];
                                                const updated = e.target.checked
                                                  ? [...current, field]
                                                  : current.filter(f => f !== field);
                                                updateColumn(column.id, 'requiredFields', updated);
                                              }}
                                              className="sr-only"
                                            />
                                            <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 font-semibold mb-1">Auto-assign ticket to Role</label>
                                    <select
                                      value={column.autoAssign || ''}
                                      onChange={(e) => updateColumn(column.id, 'autoAssign', e.target.value || undefined)}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700 cursor-pointer"
                                    >
                                      <option value="">None</option>
                                      <option value="developer">Developer</option>
                                      <option value="tester">Tester</option>
                                      <option value="reviewer">Reviewer</option>
                                      <option value="manager">Manager</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={handleBack} className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-semibold px-5">
                    Next: Review & Save
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="w-full space-y-6">
                <Card className="border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-5">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <CheckCircle className="w-4.5 h-4.5 text-indigo-600" />
                      Review Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      {/* Left: Summary Specs */}
                      <div className="md:col-span-3 space-y-4">
                        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3.5">
                          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Project Configuration</h3>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-400 font-medium">Project Name</span>
                              <span className="font-bold text-slate-800">{formData.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-400 font-medium">Board Type</span>
                              <span className="font-bold text-slate-800 capitalize">{formData.boardType}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-400 font-medium">Sprints Cycles</span>
                              <span className="font-bold text-slate-800">{formData.useSprints ? 'Enabled (Scrum)' : 'Disabled'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-400 font-medium">Active Columns</span>
                              <span className="font-bold text-slate-800">{formData.columns.length} columns</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-400 font-medium">Department Context</span>
                              <span className="font-bold text-slate-800">{formData.department || 'General'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-medium">Assigned Team Members</span>
                              <span className="font-bold text-slate-800">{selectedEmployees.length} members</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Real-time Dashboard Card Mockup Preview */}
                      <div className="md:col-span-2 space-y-2.5">
                        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Dashboard Card Mockup</h3>

                        <Card className="border border-slate-200/80 shadow-[0_6px_25px_rgba(0,0,0,0.03)] overflow-hidden border-t-4 border-t-indigo-500 rounded-2xl bg-white max-w-sm">
                          <CardContent className="p-4.5 flex flex-col space-y-3">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 inline-block w-fit">
                              PRJXXXXX
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">
                                {formData.name || 'Project Name'}
                              </h3>
                              <div className="flex gap-1">
                                <Badge className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  {formData.status}
                                </Badge>
                                <Badge className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                  {formData.priority}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 min-h-6 leading-relaxed">
                              {formData.description || 'No description provided.'}
                            </p>
                            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>PM: {user?.name || 'You'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>{selectedEmployees.length} members</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>Progress</span>
                                <span>0%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: '0%' }} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Columns Preview */}
                    <div>
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Board Columns Layout Preview</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {formData.columns.map((column) => (
                          <div key={column.id} className="flex-shrink-0 w-44 p-3.5 rounded-2xl border-2 bg-white" style={{ borderColor: column.color }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-800 text-xs truncate max-w-[100px]">{column.name}</span>
                              {column.wipLimit && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-200 text-slate-500 font-semibold">WIP: {column.wipLimit}</Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {column.isDefault ? 'System default' : 'Custom column'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-100/50 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-amber-800">Final Verification Note</p>
                        <p className="text-amber-700 mt-0.5 leading-relaxed">Ensure all parameters are set correctly. You can customize transitions, columns, and add team members after this initial creation step.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={handleBack} className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
                    Back
                  </Button>
                  <Button onClick={handleCreateProject} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-bold px-6">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Save Specifications' : 'Deploy Project Workspace'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);
}
