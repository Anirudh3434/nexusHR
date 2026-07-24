"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Calendar, Users, Target, TrendingUp, Plus, Edit, Trash2, 
  CheckCircle, Play, Pause, Clock
} from "lucide-react";

interface SprintItem {
  _id: string;
  sprintNumber: string;
  name: string;
  description?: string;
  projectId: { _id: string; name: string; projectNumber: string };
  companyId: string;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string;
  goals?: string[];
  totalTasks: number;
  completedTasks: number;
  storyPoints?: number;
  completedStoryPoints?: number;
  createdAt: string;
  createdBy: { name: string };
}

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function SprintsManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    startDate: '',
    endDate: '',
    goals: '',
  });

  useEffect(() => {
    if (user?.companyId) {
      fetchSprints();
    }
  }, [user?.companyId, filterStatus]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`/api/sprints?${params.toString()}`);
      const data = await response.json();
      setSprints(data.sprints || []);
    } catch (error) {
      console.error("Failed to fetch sprints:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load sprints" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async () => {
    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          goals: formData.goals ? formData.goals.split('\n').filter(g => g.trim()) : [],
          companyId: user?.companyId,
          createdBy: (user as any)?._id,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Sprint created" });
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          projectId: '',
          startDate: '',
          endDate: '',
          goals: '',
        });
        fetchSprints();
      } else {
        throw new Error('Failed to create sprint');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to create sprint" });
    }
  };

  const handleStatusUpdate = async (sprintId: string, status: string) => {
    try {
      const response = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId, status }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Sprint status updated" });
        fetchSprints();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update sprint status" });
    }
  };

  const handleDelete = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint?')) return;

    try {
      const response = await fetch(`/api/sprints?sprintId=${sprintId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Sprint deleted" });
        fetchSprints();
      } else {
        throw new Error('Failed to delete sprint');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete sprint" });
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-gray-600">Manage agile sprints for your projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Sprints List */}
      <div className="space-y-4">
        {sprints.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No sprints found. Create your first sprint to get started.
            </CardContent>
          </Card>
        ) : (
          sprints.map((sprint) => (
            <Card key={sprint._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{sprint.name}</h3>
                      <Badge className={statusColors[sprint.status]}>
                        {statusLabels[sprint.status]}
                      </Badge>
                      <Badge variant="outline">{sprint.sprintNumber}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{sprint.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span>{sprint.totalTasks} tasks ({sprint.completedTasks} completed)</span>
                      </div>
                      {sprint.storyPoints && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>{sprint.completedStoryPoints}/{sprint.storyPoints} SP</span>
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {sprint.totalTasks > 0 ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${sprint.totalTasks > 0 ? (sprint.completedTasks / sprint.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Goals */}
                    {sprint.goals && sprint.goals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sprint Goals</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {sprint.goals.map((goal, idx) => (
                            <li key={idx}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {sprint.status === 'planning' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(sprint._id, 'active')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(sprint._id, 'completed')}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sprint._id)}
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

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Create New Sprint</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sprint Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="e.g., Sprint 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of the sprint"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project ID *</label>
                <input
                  type="text"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter project ID"
                />
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
              <div>
                <label className="block text-sm font-medium mb-1">Sprint Goals (one per line)</label>
                <textarea
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter sprint goals, one per line"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateSprint}>Create Sprint</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
