"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, BookOpen, Key, Link as LinkIcon, Star, Clock, AlertTriangle, 
  Plus, Trash2, Edit, X, Save, ExternalLink, Globe, Sparkles, Code, GitBranch,
  ShieldCheck, ShieldAlert, ArrowRight, Copy, Check, FileUp, PenLine, KeyRound, BookmarkPlus
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DocsDashboardProps {
  projectId: string;
  searchQuery: string;
  onAddDocument?: () => void;
  onAddNote?: () => void;
  onAddCredential?: () => void;
  onAddResource?: () => void;
  onTabChange?: (tab: 'dashboard' | 'documents' | 'notes' | 'credentials' | 'resources' | 'onboarding') => void;
  onStatsChange?: (stats: { documents: number; notes: number; credentials: number; resources: number }) => void;
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
  onAddResource,
  onTabChange,
  onStatsChange
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
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const [quickAccessItems, setQuickAccessItems] = useState<Array<{ _id: string; title: string; url: string }>>([]);
  const [quickAccessLoading, setQuickAccessLoading] = useState(true);
  const [isManagingQuickAccess, setIsManagingQuickAccess] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [quickAccessForm, setQuickAccessForm] = useState({ title: '', url: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

      const docsData = await docsRes.json().catch(() => ({}));
      const notesData = await notesRes.json().catch(() => ({}));
      const credsData = await credsRes.json().catch(() => ({}));
      const resourcesData = await resourcesRes.json().catch(() => ({}));

      const newStats = {
        documents: docsData.documents?.length || 0,
        notes: notesData.notes?.length || 0,
        credentials: credsData.credentials?.length || 0,
        resources: resourcesData.resources?.length || 0
      };

      setStats(newStats);
      if (onStatsChange) onStatsChange(newStats);
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

    let formattedUrl = quickAccessForm.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const response = await fetch('/api/project-quick-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: quickAccessForm.title.trim(),
          url: formattedUrl,
          id: editingItemId
        })
      });

      if (response.ok) {
        setQuickAccessForm({ title: '', url: '' });
        setEditingItemId(null);
        setIsManagingQuickAccess(false);
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

  const copyToClipboard = (id: string, url: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleQuickPreset = (presetTitle: string, presetDomain: string) => {
    setQuickAccessForm({
      title: presetTitle,
      url: presetDomain
    });
    setEditingItemId(null);
    setIsManagingQuickAccess(true);
  };

  const getUrlIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('github.com') || lower.includes('gitlab.com')) {
      return <GitBranch className="w-4 h-4 text-slate-800 dark:text-slate-200" />;
    }
    if (lower.includes('figma.com')) {
      return <Sparkles className="w-4 h-4 text-pink-500" />;
    }
    if (lower.includes('google.com') || lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (lower.includes('jira') || lower.includes('linear.app') || lower.includes('trello.com')) {
      return <Code className="w-4 h-4 text-indigo-500" />;
    }
    return <Globe className="w-4 h-4 text-teal-500" />;
  };

  const getDisplayDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
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
      setLoadingAlerts(false);
    }
  };

  // KPI Stat Cards with theme accents & direct navigation
  const statCards = [
    { 
      id: 'documents' as const,
      title: 'Documents', 
      value: stats.documents, 
      sub: 'Specs, PDFs & media',
      icon: FileText, 
      accentColor: 'blue',
      glow: 'group-hover:border-blue-500/40 group-hover:shadow-blue-500/10',
      iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      bgGradient: 'from-blue-500/[0.04] to-transparent',
    },
    { 
      id: 'notes' as const,
      title: 'Notes', 
      value: stats.notes, 
      sub: 'Decisions & meeting logs',
      icon: BookOpen, 
      accentColor: 'emerald',
      glow: 'group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      bgGradient: 'from-emerald-500/[0.04] to-transparent',
    },
    { 
      id: 'credentials' as const,
      title: 'Credentials', 
      value: stats.credentials, 
      sub: 'Keys, tokens & logins',
      icon: Key, 
      accentColor: 'amber',
      glow: 'group-hover:border-amber-500/40 group-hover:shadow-amber-500/10',
      iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      bgGradient: 'from-amber-500/[0.04] to-transparent',
    },
    { 
      id: 'resources' as const,
      title: 'Resources', 
      value: stats.resources, 
      sub: 'Repos, designs & links',
      icon: LinkIcon, 
      accentColor: 'purple',
      glow: 'group-hover:border-purple-500/40 group-hover:shadow-purple-500/10',
      iconBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      bgGradient: 'from-purple-500/[0.04] to-transparent',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              onClick={() => onTabChange?.(stat.id)}
              className={`group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden ${stat.glow}`}
            >
              {/* Subtle Ambient Gradient Background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

              <div className="relative flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              <div className="relative mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">{stat.sub}</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Interactive Quick Actions Grid */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Quick Actions
            </h2>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Create or upload content directly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Upload Document Card */}
          <button
            onClick={onAddDocument}
            className="group relative flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Upload Document
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                PDFs, specs, architecture
              </p>
            </div>
            <Plus className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
          </button>

          {/* Create Note Card */}
          <button
            onClick={onAddNote}
            className="group relative flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <PenLine className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Create Note
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Meeting logs, RFCs, todos
              </p>
            </div>
            <Plus className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
          </button>

          {/* Add Credential Card */}
          <button
            onClick={onAddCredential}
            className="group relative flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Add Credential
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                API keys, tokens, logins
              </p>
            </div>
            <Plus className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
          </button>

          {/* Add Resource Card */}
          <button
            onClick={onAddResource}
            className="group relative flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Add Resource
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Figma, GitHub, external links
              </p>
            </div>
            <Plus className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0 mt-0.5" />
          </button>
        </div>
      </div>

      {/* 3. Quick Access Pinboard Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Quick Access
                </h3>
                {quickAccessItems.length > 0 && (
                  <span className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                    {quickAccessItems.length} {quickAccessItems.length === 1 ? 'link' : 'links'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pinned developer and design tools for this project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsManagingQuickAccess(true);
                setEditingItemId(null);
                setQuickAccessForm({ title: '', url: '' });
              }}
              className="text-xs h-8 gap-1.5 rounded-lg border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Link</span>
            </Button>
            {quickAccessItems.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsManagingQuickAccess(!isManagingQuickAccess);
                  setEditingItemId(null);
                  setQuickAccessForm({ title: '', url: '' });
                }}
                className="text-xs h-8 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-lg"
              >
                {isManagingQuickAccess ? 'Done Editing' : 'Manage Links'}
              </Button>
            )}
          </div>
        </div>

        <div className="pt-4">
          {isManagingQuickAccess ? (
            /* Manage / Add Form View */
            <div className="space-y-4">
              <form
                onSubmit={handleSaveQuickAccess}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {editingItemId ? 'Edit Quick Link' : 'Add New Quick Link'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingQuickAccess(false);
                      setEditingItemId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Link Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GitHub Repository, Figma Specs"
                      value={quickAccessForm.title}
                      onChange={(e) => setQuickAccessForm({ ...quickAccessForm, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Target URL *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. github.com/company/repo"
                      value={quickAccessForm.url}
                      onChange={(e) => setQuickAccessForm({ ...quickAccessForm, url: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsManagingQuickAccess(false);
                      setEditingItemId(null);
                      setQuickAccessForm({ title: '', url: '' });
                    }}
                    className="text-xs h-8 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs h-8 px-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingItemId ? 'Update Link' : 'Save Link'}</span>
                  </Button>
                </div>
              </form>

              {/* Editable items list */}
              {quickAccessItems.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {quickAccessItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg shrink-0 border border-slate-100 dark:border-slate-800">
                          {getUrlIcon(item.url)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {getDisplayDomain(item.url)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingItemId(item._id);
                            setQuickAccessForm({ title: item.title, url: item.url });
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit link"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuickAccess(item._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : quickAccessLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading pinned links...</div>
          ) : quickAccessItems.length === 0 ? (
            /* Modern Empty State with Quick-Start Chips */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-500 mb-3 shadow-sm">
                <LinkIcon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No quick access links pinned yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Pin essential tools, Git repositories, Figma boards, or design systems so your team can access them instantly.
              </p>

              {/* Quick Preset Shortcut Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Pin:
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('GitHub Repository', 'https://github.com/')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-2xl"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Figma Workspace', 'https://figma.com/')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 transition-all shadow-2xl"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Figma</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Google Drive Assets', 'https://drive.google.com/')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xl"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Project Board / Linear', 'https://linear.app/')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-2xl"
                >
                  <Code className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Linear/Jira</span>
                </button>
              </div>
            </div>
          ) : (
            /* Populated Links Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickAccessItems.map((item) => (
                <div
                  key={item._id}
                  className="group relative flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800 hover:border-indigo-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getUrlIcon(item.url)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <span>{getDisplayDomain(item.url)}</span>
                      </p>
                    </div>
                  </a>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item._id, item.url)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title={copiedId === item._id ? "Copied!" : "Copy URL"}
                    >
                      {copiedId === item._id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Security & Expiry Status Banner */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              pendingAlerts.length > 0 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}>
              {pendingAlerts.length > 0 ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Security & Credential Health
              </h3>
              <p className="text-xs text-slate-400">
                Automated monitoring of keys, tokens, and SSL/database expiry
              </p>
            </div>
          </div>
          {pendingAlerts.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {pendingAlerts.length} Action Required
            </span>
          )}
        </div>

        {loadingAlerts ? (
          <div className="text-center py-6 text-xs text-slate-400">Checking credentials...</div>
        ) : pendingAlerts.length === 0 ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                All credentials are active & secure
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                No passwords, API tokens, or keys are expiring within the next 30 days.
              </p>
            </div>
            <button
              onClick={() => onTabChange?.('credentials')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
            >
              Manage Credentials →
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                  alert.type === 'expired'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${
                    alert.type === 'expired' ? 'text-rose-500' : 'text-amber-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {alert.message}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {alert.details}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTabChange?.('credentials')}
                  className="text-xs h-7 px-3 shrink-0"
                >
                  Rotate / Review
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
