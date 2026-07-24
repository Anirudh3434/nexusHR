"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useParams } from "next/navigation";
import { Settings, Plus, Trash2, X, Save, ArrowLeft, Link, Unlink, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import StatusTransitionFlow from "@/components/projects/StatusTransitionFlow";

interface BoardColumn {
  id: string;
  name: string;
  status: string;
  color?: string;
  position: number;
  wipLimit?: number;
  allowedTransitions?: string[];
  customStatuses?: Array<{
    id: string;
    name: string;
    color?: string;
    position: number;
  }>;
}

interface Project {
  _id: string;
  name: string;
  projectNumber: string;
  githubRepo?: string;
  board?: {
    columns: BoardColumn[];
  };
}

export default function ProjectSettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<BoardColumn | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  
  // GitHub integration state
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connectingRepo, setConnectingRepo] = useState(false);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setProject(data.project);
      setColumns(data.project?.board?.columns || []);
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to load project" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProject();
    
    // Check for GitHub token from URL params (after OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('github_token');
    if (token) {
      setGithubToken(token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [projectId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          board: {
            ...project?.board,
            columns: columns
          }
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Settings saved successfully" });
        await fetchProject();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomStatus = (column: BoardColumn) => {
    const newStatus = {
      id: "cs_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      name: 'New Status',
      color: '#6B7280',
      position: (column.customStatuses?.length || 0)
    };
    
    const updatedColumns = columns.map(col => 
      col.id === column.id 
        ? { ...col, customStatuses: [...(col.customStatuses || []), newStatus] }
        : col
    );
    setColumns(updatedColumns);
  };

  const handleUpdateCustomStatus = (columnId: string, statusId: string, field: string, value: string) => {
    const updatedColumns = columns.map(col => {
      if (col.id === columnId && col.customStatuses) {
        const updatedStatuses = col.customStatuses.map(status => 
          status.id === statusId ? { ...status, [field]: value } : status
        );
        return { ...col, customStatuses: updatedStatuses };
      }
      return col;
    });
    setColumns(updatedColumns);
  };

  const handleDeleteCustomStatus = (columnId: string, statusId: string) => {
    const updatedColumns = columns.map(col => {
      if (col.id === columnId && col.customStatuses) {
        const updatedStatuses = col.customStatuses.filter(status => status.id !== statusId);
        return { ...col, customStatuses: updatedStatuses };
      }
      return col;
    });
    setColumns(updatedColumns);
  };

  const handleTransitionChange = (fromStatus: string, toStatus: string, allowed: boolean) => {
    const updatedColumns = columns.map(col => {
      if (col.status === fromStatus) {
        const currentTransitions = col.allowedTransitions || [];
        let newTransitions: string[];
        
        if (allowed) {
          // Add transition if not already present
          newTransitions = currentTransitions.includes(toStatus) 
            ? currentTransitions 
            : [...currentTransitions, toStatus];
        } else {
          // Remove transition
          newTransitions = currentTransitions.filter(s => s !== toStatus);
        }
        
        return { ...col, allowedTransitions: newTransitions };
      }
      return col;
    });
    setColumns(updatedColumns);
  };

  // GitHub integration functions
  const handleGithubAuth = async () => {
    try {
      const response = await fetch('/api/github/auth');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to initiate GitHub authentication" });
    }
  };

  const fetchGithubRepos = async () => {
    if (!githubToken) {
      addToast({ type: "error", title: "Error", description: "Please authenticate with GitHub first" });
      return;
    }

    setLoadingRepos(true);
    try {
      const response = await fetch(`/api/github/repos?accessToken=${githubToken}`);
      const data = await response.json();
      if (data.repos) {
        setGithubRepos(data.repos);
        setShowGithubModal(true);
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to fetch GitHub repositories" });
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo) {
      addToast({ type: "error", title: "Error", description: "Please select a repository" });
      return;
    }

    setConnectingRepo(true);
    try {
      const response = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoFullName: selectedRepo,
          accessToken: githubToken,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "GitHub repository connected successfully" });
        setShowGithubModal(false);
        setSelectedRepo('');
        await fetchProject();
      } else {
        throw new Error('Failed to connect repository');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to connect repository" });
    } finally {
      setConnectingRepo(false);
    }
  };

  const handleDisconnectRepo = async () => {
    if (!confirm('Are you sure you want to disconnect this repository?')) return;

    try {
      const response = await fetch(`/api/github/connect?projectId=${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "GitHub repository disconnected successfully" });
        await fetchProject();
      } else {
        throw new Error('Failed to disconnect repository');
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to disconnect repository" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Project Settings</h1>
              <p className="text-sm text-slate-500">{project?.name} ({project?.projectNumber})</p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Status Transition Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Status Transition Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTransitionFlow columns={columns} onTransitionChange={handleTransitionChange} />
          </CardContent>
        </Card>

        {/* GitHub Integration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              GitHub Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project?.githubRepo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Link className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Repository Connected</p>
                      <p className="text-sm text-green-600">{project.githubRepo}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDisconnectRepo}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    Disconnect
                  </Button>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Automatic Status Updates:</strong> When a branch is created with a ticket number (e.g., TASK-123, #123), 
                    the corresponding task will automatically move to "in progress" status.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">No Repository Connected</p>
                      <p className="text-sm text-slate-600">Connect a GitHub repository to enable automatic task status updates</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  {!githubToken ? (
                    <Button
                      onClick={handleGithubAuth}
                      className="flex items-center gap-2"
                    >
                      <GitBranch className="w-4 h-4" />
                      Authenticate with GitHub
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={fetchGithubRepos}
                        disabled={loadingRepos}
                        className="flex items-center gap-2"
                      >
                        <Link className="w-4 h-4" />
                        {loadingRepos ? 'Loading Repos...' : 'Select Repository'}
                      </Button>
                      <Button
                        onClick={() => setGithubToken('')}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        Clear Token
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Board Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Board Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {columns.map((column) => (
                <div key={column.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-semibold text-slate-800">{column.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {column.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Custom Statuses */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Custom Statuses for {column.name}</label>
                      <button
                        onClick={() => handleAddCustomStatus(column)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Status
                      </button>
                    </div>

                    {column.customStatuses && column.customStatuses.length > 0 ? (
                      <div className="space-y-2">
                        {column.customStatuses.map((status) => (
                          <div key={status.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <input
                              type="color"
                              value={status.color}
                              onChange={(e) => handleUpdateCustomStatus(column.id, status.id, 'color', e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <input
                              type="text"
                              value={status.name}
                              onChange={(e) => handleUpdateCustomStatus(column.id, status.id, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                              placeholder="Enter status name"
                            />
                            <button
                              onClick={() => handleDeleteCustomStatus(column.id, status.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No custom statuses defined for {column.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* GitHub Repository Selection Modal */}
        {showGithubModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Select GitHub Repository</h3>
                  <button
                    onClick={() => setShowGithubModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-2">
                  {githubRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo.full_name)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRepo === repo.full_name
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{repo.full_name}</p>
                          <p className="text-sm text-slate-500">{repo.private ? 'Private' : 'Public'}</p>
                        </div>
                        {selectedRepo === repo.full_name && (
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  onClick={() => setShowGithubModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectRepo}
                  disabled={!selectedRepo || connectingRepo}
                  className="flex items-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  {connectingRepo ? 'Connecting...' : 'Connect Repository'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
