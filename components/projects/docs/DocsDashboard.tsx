"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  FileText, BookOpen, Key, Link, Star, Clock, AlertTriangle, 
  Plus, Trash2, Edit, X, Save, ExternalLink, Globe, Sparkles, Code, GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DocsDashboardProps {
  projectId: string;
  searchQuery: string;
  onAddDocument?: () => void;
  onAddNote?: () => void;
  onAddCredential?: () => void;
  onAddResource?: () => void;
}

interface ActivityLog {
  _id: string;
  action: string;
  resourceType: string;
  resourceName: string;
  timestamp: string;
  userName: string;
}

interface Credential {
  _id: string;
  service: string;
  environment: string;
  expiryDate?: string;
}

export default function DocsDashboard({ 
  projectId, 
  searchQuery,
  onAddDocument,
  onAddNote,
  onAddCredential,
  onAddResource
}: DocsDashboardProps) {
  const [stats, setStats] = useState<{
    documents: number;
    notes: number;
    credentials: number;
    resources: number;
  }>({
    documents: 0,
    notes: 0,
    credentials: 0,
    resources: 0
  });
  const [pendingAlerts, setPendingAlerts] = useState<Array<{
    id: string;
    message: string;
    details: string;
    type: 'expiring' | 'expired';
  }>>([]);
  const [loading, setLoading] = useState(true);

  const [quickAccessItems, setQuickAccessItems] = useState<Array<{ _id: string; title: string; url: string }>>([]);
  const [quickAccessLoading, setQuickAccessLoading] = useState(true);
  const [isManagingQuickAccess, setIsManagingQuickAccess] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [quickAccessForm, setQuickAccessForm] = useState({ title: '', url: '' });

  useEffect(() => {
    fetchStats();
    fetchPendingAlerts();
    fetchQuickAccessItems();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const [docsRes, notesRes, credsRes, resourcesRes] = await Promise.all([
        fetch(`/api/project-documents?projectId=${projectId}`),
        fetch(`/api/project-notes?projectId=${projectId}`),
        fetch(`/api/project-credentials?projectId=${projectId}`),
        fetch(`/api/project-resources?projectId=${projectId}`)
      ]);

      const docsData = await docsRes.json();
      const notesData = await notesRes.json();
      const credsData = await credsRes.json();
      const resourcesData = await resourcesRes.json();

      setStats(prev => ({
        ...prev,
        documents: docsData.documents?.length || 0,
        notes: notesData.notes?.length || 0,
        credentials: credsData.credentials?.length || 0,
        resources: resourcesData.resources?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchQuickAccessItems = async () => {
    try {
      setQuickAccessLoading(true);
      const response = await fetch(`/api/project-quick-access?projectId=${projectId}`);
      const data = await response.json();
      setQuickAccessItems(data.items || []);
    } catch (error) {
      console.error('Error fetching quick access items:', error);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  const handleSaveQuickAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAccessForm.title || !quickAccessForm.url) return;

    // Ensure URL has protocol
    let formattedUrl = quickAccessForm.url;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const response = await fetch('/api/project-quick-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: quickAccessForm.title,
          url: formattedUrl,
          id: editingItemId
        })
      });

      if (response.ok) {
        setQuickAccessForm({ title: '', url: '' });
        setEditingItemId(null);
        fetchQuickAccessItems();
      }
    } catch (error) {
      console.error('Error saving quick access item:', error);
    }
  };

  const handleDeleteQuickAccess = async (id: string) => {
    try {
      const response = await fetch(`/api/project-quick-access?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchQuickAccessItems();
        if (editingItemId === id) {
          setEditingItemId(null);
          setQuickAccessForm({ title: '', url: '' });
        }
      }
    } catch (error) {
      console.error('Error deleting quick access item:', error);
    }
  };

  const getUrlIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('github.com') || lower.includes('gitlab.com')) {
      return <GitBranch className="w-5 h-5 text-slate-850" />;
    }
    if (lower.includes('figma.com')) {
      return <Sparkles className="w-5 h-5 text-pink-500" />;
    }
    if (lower.includes('google.com') || lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (lower.includes('jira') || lower.includes('linear.app') || lower.includes('trello.com')) {
      return <Code className="w-5 h-5 text-indigo-500" />;
    }
    return <Globe className="w-5 h-5 text-slate-500" />;
  };

  const getDisplayDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const fetchPendingAlerts = async () => {
    try {
      const response = await fetch(`/api/project-credentials?projectId=${projectId}`);
      const data = await response.json();
      
      const credentials = data.credentials || [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const expiringCredentials = credentials.filter((cred: Credential) => {
        if (!cred.expiryDate) return false;
        const expiryDate = new Date(cred.expiryDate);
        return expiryDate <= thirtyDaysFromNow && expiryDate > now;
      });

      const expiredCredentials = credentials.filter((cred: Credential) => {
        if (!cred.expiryDate) return false;
        const expiryDate = new Date(cred.expiryDate);
        return expiryDate <= now;
      });

      const alerts = [
        ...expiringCredentials.map((cred: Credential) => ({
          id: cred._id,
          message: `${cred.service} (${cred.environment}) expiring soon`,
          details: `Expires on ${new Date(cred.expiryDate!).toLocaleDateString()}`,
          type: 'expiring' as const
        })),
        ...expiredCredentials.map((cred: Credential) => ({
          id: cred._id,
          message: `${cred.service} (${cred.environment}) expired`,
          details: `Expired on ${new Date(cred.expiryDate!).toLocaleDateString()}`,
          type: 'expired' as const
        }))
      ];

      setPendingAlerts(alerts);
    } catch (error) {
      console.error('Error fetching pending alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Documents', 
      value: stats.documents, 
      icon: FileText, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      title: 'Notes', 
      value: stats.notes, 
      icon: BookOpen, 
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    { 
      title: 'Credentials', 
      value: stats.credentials, 
      icon: Key, 
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    { 
      title: 'Resources', 
      value: stats.resources, 
      icon: Link, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={onAddDocument} variant="outline" className="flex items-center gap-2 justify-center hover:bg-slate-50 transition-colors">
              <FileText className="w-4 h-4 text-blue-600" />
              Upload Document
            </Button>
            <Button onClick={onAddNote} variant="outline" className="flex items-center gap-2 justify-center hover:bg-slate-50 transition-colors">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Create Note
            </Button>
            <Button onClick={onAddCredential} variant="outline" className="flex items-center gap-2 justify-center hover:bg-slate-50 transition-colors">
              <Key className="w-4 h-4 text-amber-600" />
              Add Credential
            </Button>
            <Button onClick={onAddResource} variant="outline" className="flex items-center gap-2 justify-center hover:bg-slate-50 transition-colors">
              <Link className="w-4 h-4 text-purple-600" />
              Add Resource
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Card */}
      <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Link className="w-5 h-5 text-indigo-500" />
            Quick Access
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsManagingQuickAccess(!isManagingQuickAccess);
              setEditingItemId(null);
              setQuickAccessForm({ title: '', url: '' });
            }}
            className="text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold"
          >
            {isManagingQuickAccess ? 'Back to View' : 'Manage Links'}
          </Button>
        </CardHeader>
        <CardContent>
          {isManagingQuickAccess ? (
            <div className="space-y-4">
              {/* Form */}
              <form onSubmit={handleSaveQuickAccess} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {editingItemId ? 'Edit Link' : 'Add New Quick Link'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Link Name (e.g. GitHub Repo)"
                    value={quickAccessForm.title}
                    onChange={(e) => setQuickAccessForm({ ...quickAccessForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. github.com/user/repo)"
                    value={quickAccessForm.url}
                    onChange={(e) => setQuickAccessForm({ ...quickAccessForm, url: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingItemId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingItemId(null);
                        setQuickAccessForm({ title: '', url: '' });
                      }}
                      className="px-3 py-1 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    className="flex items-center gap-1 text-xs px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingItemId ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>

              {/* List of links to edit/delete */}
              {quickAccessLoading ? (
                <div className="text-center py-4 text-slate-400 text-sm">Loading links...</div>
              ) : quickAccessItems.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm italic">No links added yet.</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {quickAccessItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200/80 hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-slate-50 rounded">
                          {getUrlIcon(item.url)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                          <p className="text-xs text-slate-400 truncate">{getDisplayDomain(item.url)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3">
                        <button
                          onClick={() => {
                            setEditingItemId(item._id);
                            setQuickAccessForm({ title: item.title, url: item.url });
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuickAccess(item._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* View Mode */
            quickAccessLoading ? (
              <div className="text-center py-8 text-slate-550">Loading links...</div>
            ) : quickAccessItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Link className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No quick access links yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px]">Add links to repositories, Figma boards, design assets, or external platforms.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsManagingQuickAccess(true)}
                  className="mt-3.5 flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Link
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {quickAccessItems.map((item) => (
                  <a
                    key={item._id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/60 rounded-xl border border-slate-200/80 hover:border-indigo-100 hover:shadow-[0_2px_8px_-3px_rgba(79,70,229,0.12)] hover:-translate-y-0.5 transition-all duration-200 group/link"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-indigo-50/50 rounded-lg group-hover/link:bg-indigo-50 transition-colors">
                        {getUrlIcon(item.url)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 group-hover/link:text-indigo-600 transition-colors truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 truncate">{getDisplayDomain(item.url)}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover/link:text-indigo-400 ml-2 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Pending Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Pending Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading alerts...</div>
          ) : pendingAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No pending alerts</div>
          ) : (
            <div className="space-y-2">
              {pendingAlerts.map((alert) => (
                <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  alert.type === 'expired' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.type === 'expired' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      alert.type === 'expired' ? 'text-red-900' : 'text-amber-900'
                    }`}>{alert.message}</p>
                    <p className={`text-xs ${
                      alert.type === 'expired' ? 'text-red-700' : 'text-amber-700'
                    }`}>{alert.details}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Navigate to credentials section
                      window.location.hash = 'credentials';
                    }}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
