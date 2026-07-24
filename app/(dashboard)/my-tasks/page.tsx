"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  KanbanSquare, Search, Clock, CheckCircle, Calendar, User, 
  Play, Pause, Square, AlertCircle
} from "lucide-react";

interface TaskItem {
  _id: string;
  taskNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: { _id: string; name: string; projectNumber: string };
  assignedTo?: { _id: string; name: string; email: string; department: string };
  assignedBy: { _id: string; name: string };
  startDate?: string;
  dueDate: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours: number;
  progressPercentage: number;
  dependsOn?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  blocks?: Array<{ _id: string; taskNumber: string; title: string; status: string }>;
  tags?: string[];
  comments?: Array<{ userId: string; userName: string; text: string; createdAt: string }>;
  createdAt: string;
  createdBy: { name: string };
}

interface TimeLogItem {
  _id: string;
  logNumber: string;
  taskId: string;
  projectId: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: string;
  description?: string;
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
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

export default function MyTasksPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [runningTimer, setRunningTimer] = useState<TimeLogItem | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (user?.companyId) {
      fetchTasks();
      fetchRunningTimer();
    }
  }, [user?.companyId, filterStatus]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningTimer) {
      interval = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - new Date(runningTimer.startTime).getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      
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

  const fetchRunningTimer = async () => {
    try {
      const response = await fetch(`/api/time-logs?status=running`);
      const data = await response.json();
      if (data.timeLogs && data.timeLogs.length > 0) {
        setRunningTimer(data.timeLogs[0]);
      }
    } catch (error) {
      console.error("Failed to fetch running timer:", error);
    }
  };

  const handleStartTimer = async (taskId: string, projectId: string) => {
    try {
      const response = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        setRunningTimer(data.timeLog);
        addToast({ type: "success", title: "Success", description: "Timer started" });
      } else {
        throw new Error('Failed to start timer');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to start timer" });
    }
  };

  const handleStopTimer = async () => {
    if (!runningTimer) return;

    try {
      const response = await fetch('/api/time-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: runningTimer._id, action: 'stop' }),
      });

      if (response.ok) {
        setRunningTimer(null);
        setTimerSeconds(0);
        fetchTasks();
        addToast({ type: "success", title: "Success", description: "Timer stopped" });
      } else {
        throw new Error('Failed to stop timer');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to stop timer" });
    }
  };

  const handleStatusUpdate = async (taskId: string, status: string, progress: number) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, progressPercentage: progress }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Task updated" });
        fetchTasks();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update task" });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-gray-600">Manage your assigned tasks</p>
        </div>
        
        {/* Running Timer */}
        {runningTimer && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
            <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
            <div className="text-sm">
              <span className="font-medium text-yellow-800">Timer Running:</span>
              <span className="ml-2 font-mono text-yellow-700">{formatTime(timerSeconds)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopTimer}
              className="text-red-600 hover:text-red-700"
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </div>
        )}
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
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No tasks found
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task._id} className={task.status === 'in_progress' ? 'border-yellow-300 bg-yellow-50' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      {task.status === 'in_progress' && (
                        <Badge className="bg-yellow-100 text-yellow-700 animate-pulse">
                          <Clock className="w-3 h-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.taskNumber}</p>
                    <p className="text-gray-700 mb-3">{task.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <KanbanSquare className="w-4 h-4" />
                        <span>{task.projectId?.name || 'Unknown Project'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                      {task.estimatedHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      )}
                      {task.actualHours > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{task.actualHours.toFixed(1)}h actual</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
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
                    {!runningTimer && task.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartTimer(task._id, task.projectId._id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {task.status === 'to_do' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(task._id, 'in_progress', 25)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(task._id, 'in_review', 75)}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(task._id, 'completed', 100)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Tasks</div>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600">{tasks.filter(t => t.status === 'in_progress').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold">{tasks.reduce((sum, t) => sum + t.actualHours, 0).toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
