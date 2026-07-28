"use client";

import React, { useState } from 'react';
import ReportTemplates from '../../../components/reports/ReportTemplates';
import ReportViewer from '../../../components/reports/ReportViewer';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const [view, setView] = useState<'templates' | 'viewer'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setView('viewer');
  };

  const handleCreateNew = () => {
    // For now, just show a message
    alert('Report builder will be implemented in the next phase');
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setView('templates');
  };

  return (
    <div className="container mx-auto p-6">
      {view === 'templates' ? (
        <ReportTemplates 
          onSelectTemplate={handleSelectTemplate}
          onCreateNew={handleCreateNew}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedTemplate?.name}
              </h1>
            </div>
          </div>

          {selectedTemplate && (
            <ReportViewer template={selectedTemplate} />
          )}
        </div>
      )}
    </div>
  );
}
