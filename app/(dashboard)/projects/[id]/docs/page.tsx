"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, 
  BookOpen, 
  Key, 
  Link as LinkIcon, 
  UserPlus, 
  Search, 
  Grid3x3,
  Vault,
  ArrowLeft,
  X
} from "lucide-react";
import DocumentsSection from "@/components/projects/docs/DocumentsSection";
import NotesSection from "@/components/projects/docs/NotesSection";
import CredentialsSection from "@/components/projects/docs/CredentialsSection";
import ResourcesSection from "@/components/projects/docs/ResourcesSection";
import OnboardingSection from "@/components/projects/docs/OnboardingSection";
import DocsDashboard from "@/components/projects/docs/DocsDashboard";
import QuickAddDropdown from "@/components/projects/docs/modals/QuickAddDropdown";
import DocumentUploadModal from "@/components/projects/docs/modals/DocumentUploadModal";
import NoteCreationModal from "@/components/projects/docs/modals/NoteCreationModal";
import CredentialCreationModal from "@/components/projects/docs/modals/CredentialCreationModal";
import ResourceCreationModal from "@/components/projects/docs/modals/ResourceCreationModal";

type TabType = 'dashboard' | 'documents' | 'notes' | 'credentials' | 'resources' | 'onboarding';

export default function ProjectDocsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);

  const [counts, setCounts] = useState<{
    documents: number;
    notes: number;
    credentials: number;
    resources: number;
  }>({
    documents: 0,
    notes: 0,
    credentials: 0,
    resources: 0,
  });

  const tabs: Array<{ id: TabType; label: string; icon: any; count?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Grid3x3 },
    { id: 'documents', label: 'Documents', icon: FileText, count: counts.documents },
    { id: 'notes', label: 'Notes', icon: BookOpen, count: counts.notes },
    { id: 'credentials', label: 'Credentials', icon: Key, count: counts.credentials },
    { id: 'resources', label: 'Resources', icon: LinkIcon, count: counts.resources },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-slate-50/50 dark:bg-[#070d19] overflow-hidden">
      {/* Container 1: Top Header Toolbar */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 shadow-sm flex-shrink-0 z-10 px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Left: Back button + Vault branding */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/projects/${projectId}/board`)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-sm active:scale-95 shrink-0"
              title="Return to Kanban board"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Back to Board</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Vault className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                  Vault
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Centralized project documentation, credentials & resources
                </p>
              </div>
            </div>
          </div>

          {/* Right: Search & Quick Add */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search across all sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 border border-slate-200/90 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56 sm:w-72 lg:w-80 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <QuickAddDropdown
              onAddDocument={() => setShowDocumentModal(true)}
              onAddNote={() => setShowNoteModal(true)}
              onAddCredential={() => setShowCredentialModal(true)}
              onAddResource={() => setShowResourceModal(true)}
            />
          </div>
        </div>

        {/* Floating Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all duration-150 border-b-2 shrink-0 select-none ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-500/10'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full border ${
                      isActive
                        ? 'bg-indigo-600 text-white border-transparent'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Container 2: Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DocsDashboard 
            projectId={projectId} 
            searchQuery={searchQuery} 
            onAddDocument={() => setShowDocumentModal(true)}
            onAddNote={() => setShowNoteModal(true)}
            onAddCredential={() => setShowCredentialModal(true)}
            onAddResource={() => setShowResourceModal(true)}
            onTabChange={(tab) => setActiveTab(tab)}
            onStatsChange={(newStats) => setCounts(newStats)}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentsSection 
            projectId={projectId} 
            searchQuery={searchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
        {activeTab === 'notes' && (
          <NotesSection 
            projectId={projectId} 
            searchQuery={searchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
        {activeTab === 'credentials' && (
          <CredentialsSection 
            projectId={projectId} 
            searchQuery={searchQuery}
          />
        )}
        {activeTab === 'resources' && (
          <ResourcesSection 
            projectId={projectId} 
            searchQuery={searchQuery}
          />
        )}
        {activeTab === 'onboarding' && (
          <OnboardingSection 
            projectId={projectId}
          />
        )}
      </div>

      {/* Modals */}
      <DocumentUploadModal
        projectId={projectId}
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSuccess={() => {
          setActiveTab('documents');
        }}
      />
      <NoteCreationModal
        projectId={projectId}
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSuccess={() => {
          setActiveTab('notes');
        }}
      />
      <CredentialCreationModal
        projectId={projectId}
        isOpen={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
        onSuccess={() => {
          setActiveTab('credentials');
        }}
      />
      <ResourceCreationModal
        projectId={projectId}
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        onSuccess={() => {
          setActiveTab('resources');
        }}
      />
    </div>
  );
}
