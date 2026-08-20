"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  FolderKanban, Search, Calendar, User, Users, DollarSign, 
  TrendingUp, Clock, CheckCircle, Loader2
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
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function MyProjectsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    if (user?.companyId) {
      fetchProjects();
    }
  }, [user?.companyId, filterStatus]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-gray-600 dark:text-gray-400">View your assigned projects</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
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
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
              No projects found
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <Badge className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                      <Badge className={priorityColors[project.priority]}>
                        {priorityLabels[project.priority]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{project.projectNumber}</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{project.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Manager: {project.managerId?.name || "Sunil Singh (CTO)"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{project.members?.length || 0} members</span>
                      </div>
                      {project.budget && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>{project.currency || 'USD'} {project.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-medium">{project.progressPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${project.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* My Role */}
                    {project.members && project.members.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Badge variant="outline">
                          {project.members.find((m: any) => (m.employeeId?._id || m.employeeId)?.toString() === (user as any)?._id?.toString() || (m.employeeId?._id || m.employeeId)?.toString() === (user as any)?.id?.toString())?.role || 'Team Member'}
                        </Badge>
                        <span>• {project.members.find((m: any) => (m.employeeId?._id || m.employeeId)?.toString() === (user as any)?._id?.toString() || (m.employeeId?._id || m.employeeId)?.toString() === (user as any)?.id?.toString())?.allocationPercentage || 100}% allocation</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/projects/${project._id}/board`}
                      className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl"
                    >
                      <FolderKanban className="w-4 h-4 mr-2" />
                      View Board
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
