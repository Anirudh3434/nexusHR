"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, 
  BookOpen, 
  Key, 
  Link, 
  UserPlus, 
  Search, 
  Plus,
  Grid3x3,
  List,
  Filter,
  Star,
  Clock,
  Activity,
  Vault,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Grid3x3 },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'notes' as TabType, label: 'Notes', icon: BookOpen },
    { id: 'credentials' as TabType, label: 'Credentials', icon: Key },
    { id: 'resources' as TabType, label: 'Resources', icon: Link },
    { id: 'onboarding' as TabType, label: 'Onboarding', icon: UserPlus },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-slate-50 overflow-hidden">
      {/* Container 1: Top Header Toolbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-10 px-8 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}/board`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Board</span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <Vault className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vault</h1>
                <p className="text-xs text-slate-500">Centralized documentation and resources</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search across all sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 w-80 text-sm bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>
            <QuickAddDropdown
              onAddDocument={() => setShowDocumentModal(true)}
              onAddNote={() => setShowNoteModal(true)}
              onAddCredential={() => setShowCredentialModal(true)}
              onAddResource={() => setShowResourceModal(true)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Container 2: Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && (
          <DocsDashboard 
            projectId={projectId} 
            searchQuery={searchQuery} 
            onAddDocument={() => setShowDocumentModal(true)}
            onAddNote={() => setShowNoteModal(true)}
            onAddCredential={() => setShowCredentialModal(true)}
            onAddResource={() => setShowResourceModal(true)}
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
          // Force refresh of documents section
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
