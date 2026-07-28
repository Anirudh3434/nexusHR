"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Plus, Search, Edit, Trash2, Play, FileText, 
  Calendar, Users, TrendingUp, Clock 
} from 'lucide-react';

interface ReportTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  isTemplate: boolean;
  isPublic: boolean;
  viewCount: number;
  lastUsed: Date;
  createdAt: Date;
  createdBy: {
    name: string;
  };
}

const categoryLabels: Record<string, string> = {
  attendance: 'Attendance',
  performance: 'Performance',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  retention: 'Retention',
  general: 'General',
};

const categoryIcons: Record<string, any> = {
  attendance: Clock,
  performance: TrendingUp,
  payroll: Users,
  recruitment: Users,
  retention: TrendingUp,
  general: FileText,
};

export default function ReportTemplates({ onSelectTemplate, onCreateNew }: { 
  onSelectTemplate: (template: ReportTemplate) => void;
  onCreateNew: () => void;
}) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-id'] = userData.id || '';
      }

      const response = await fetch('/api/reports/templates', { headers });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-id'] = userData.id || '';
      }

      const response = await fetch(`/api/reports/templates/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await fetchTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const CategoryIcon = categoryIcons[selectedCategory] || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Report Templates</h2>
          <p className="text-gray-600 dark:text-gray-400">Choose a template or create a custom report</p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border rounded-md"
                />
              </div>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              <option value="attendance">Attendance</option>
              <option value="performance">Performance</option>
              <option value="payroll">Payroll</option>
              <option value="recruitment">Recruitment</option>
              <option value="retention">Retention</option>
              <option value="general">General</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">Loading templates...</CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No templates found. Create your first report to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const Icon = categoryIcons[template.category] || FileText;
            return (
              <Card 
                key={template._id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {categoryLabels[template.category]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {template.viewCount} views
                    </div>
                    {template.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(template.lastUsed).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template._id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
