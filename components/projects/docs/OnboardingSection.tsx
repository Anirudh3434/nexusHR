"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  BookOpen, 
  Save, 
  Edit,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from "lucide-react";

interface OnboardingSectionProps {
  projectId: string;
}

interface OnboardingData {
  projectOverview: {
    businessPurpose: string;
    architectureOverview: string;
    techStack: string[];
  };
  development: {
    folderStructure: string;
    developmentWorkflow: string;
    localSetupGuide: string;
    installationSteps: string[];
    requiredTools: string[];
    codingStandards: string;
  };
  git: {
    branchStrategy: string;
    pullRequestProcess: string;
  };
  deployment: {
    deploymentProcess: string;
    testingProcess: string;
    releaseProcess: string;
  };
  team: {
    importantContacts: string;
    teamMembers: Array<{
      userId: string;
      name: string;
      role: string;
      email: string;
    }>;
  };
  documentation: {
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    knownIssues: Array<{
      issue: string;
      solution: string;
    }>;
    troubleshootingGuide: string;
  };
}

export default function OnboardingSection({ projectId }: OnboardingSectionProps) {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    projectOverview: true,
    development: false,
    git: false,
    deployment: false,
    team: false,
    documentation: false
  });

  useEffect(() => {
    fetchOnboarding();
  }, [projectId]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-onboarding?projectId=${projectId}`);
      const data = await response.json();
      setOnboarding(data.onboarding);
    } catch (error) {
      console.error('Error fetching onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/project-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...onboarding,
          userId: 'current-user-id',
          userName: 'Current User',
          userEmail: 'user@example.com'
        })
      });

      if (response.ok) {
        setEditing(false);
        // Show success toast
      }
    } catch (error) {
      console.error('Error saving onboarding:', error);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setOnboarding(prev => {
      if (!prev) return prev;
      const sectionData = prev[section as keyof OnboardingData];
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: value
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading onboarding guide...</div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No onboarding guide created yet</p>
          <Button onClick={() => setEditing(true)} className="mt-4">
            Create Onboarding Guide
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Project Onboarding Guide</h2>
          <p className="text-sm text-slate-500">Complete guide for new team members</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Guide
            </Button>
          )}
        </div>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('projectOverview')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Project Overview</span>
            {expandedSections.projectOverview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.projectOverview && (
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Business Purpose</label>
              {editing ? (
                <textarea
                  value={onboarding.projectOverview.businessPurpose}
                  onChange={(e) => updateField('projectOverview', 'businessPurpose', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.projectOverview.businessPurpose || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Architecture Overview</label>
              {editing ? (
                <textarea
                  value={onboarding.projectOverview.architectureOverview}
                  onChange={(e) => updateField('projectOverview', 'architectureOverview', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.projectOverview.architectureOverview || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tech Stack</label>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {onboarding.projectOverview.techStack.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                      {tech}
                      <button onClick={() => {
                        const newStack = [...onboarding.projectOverview.techStack];
                        newStack.splice(idx, 1);
                        updateField('projectOverview', 'techStack', newStack);
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button className="px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded-full text-sm flex items-center gap-1 hover:border-indigo-500 hover:text-indigo-500">
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {onboarding.projectOverview.techStack.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Development */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('development')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Development</span>
            {expandedSections.development ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.development && (
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Folder Structure</label>
              {editing ? (
                <textarea
                  value={onboarding.development.folderStructure}
                  onChange={(e) => updateField('development', 'folderStructure', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <pre className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto">
                  {onboarding.development.folderStructure || 'Not specified'}
                </pre>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Development Workflow</label>
              {editing ? (
                <textarea
                  value={onboarding.development.developmentWorkflow}
                  onChange={(e) => updateField('development', 'developmentWorkflow', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.development.developmentWorkflow || 'Not specified'}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Git */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('git')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Git & Version Control</span>
            {expandedSections.git ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.git && (
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Branch Strategy</label>
              {editing ? (
                <textarea
                  value={onboarding.git.branchStrategy}
                  onChange={(e) => updateField('git', 'branchStrategy', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.git.branchStrategy || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pull Request Process</label>
              {editing ? (
                <textarea
                  value={onboarding.git.pullRequestProcess}
                  onChange={(e) => updateField('git', 'pullRequestProcess', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.git.pullRequestProcess || 'Not specified'}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Deployment */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('deployment')}
        >
          <CardTitle className="flex items-center justify-between">
            <span>Deployment & Release</span>
            {expandedSections.deployment ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.deployment && (
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deployment Process</label>
              {editing ? (
                <textarea
                  value={onboarding.deployment.deploymentProcess}
                  onChange={(e) => updateField('deployment', 'deploymentProcess', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.deployment.deploymentProcess || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Testing Process</label>
              {editing ? (
                <textarea
                  value={onboarding.deployment.testingProcess}
                  onChange={(e) => updateField('deployment', 'testingProcess', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.deployment.testingProcess || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Release Process</label>
              {editing ? (
                <textarea
                  value={onboarding.deployment.releaseProcess}
                  onChange={(e) => updateField('deployment', 'releaseProcess', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-600">{onboarding.deployment.releaseProcess || 'Not specified'}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
