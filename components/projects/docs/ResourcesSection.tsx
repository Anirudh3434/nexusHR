"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import ResourceCreationModal from "@/components/projects/docs/modals/ResourceCreationModal";
import { 
  Link, 
  Plus, 
  Star, 
  ExternalLink,
  GitBranch,
  PenTool,
  Layout,
  Globe,
  Cloud,
  Monitor
} from "lucide-react";

interface ResourcesSectionProps {
  projectId: string;
  searchQuery: string;
}

interface Resource {
  _id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdBy: { name: string };
  updatedAt: string;
}

export default function ResourcesSection({ projectId, searchQuery }: ResourcesSectionProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const categories = ['all', 'Git', 'Design', 'ProjectManagement', 'API', 'Documentation', 'CI/CD', 'Monitoring', 'Hosting', 'Cloud', 'Domain', 'Other'];

  useEffect(() => {
    fetchResources();
  }, [projectId]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-resources?projectId=${projectId}`);
      const data = await response.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (resource.tags && resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || resource.isFavorite;
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Git': 'bg-slate-800 text-white',
      'Design': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
      'ProjectManagement': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      'API': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
      'Documentation': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      'CI/CD': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      'Monitoring': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
      'Hosting': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      'Cloud': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      'Domain': 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
      'Other': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    };
    return colors[category] || colors['Other'];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Git': return GitBranch;
      case 'Design': return PenTool;
      case 'ProjectManagement': return Layout;
      case 'API': return Layout;
      case 'Documentation': return Layout;
      case 'CI/CD': return Monitor;
      case 'Monitoring': return Monitor;
      case 'Hosting': return Cloud;
      case 'Cloud': return Cloud;
      case 'Domain': return Globe;
      default: return Link;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500 dark:text-slate-400">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 dark:border-slate-700"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showFavoritesOnly 
                ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
            Favorites
          </button>
        </div>
        <Button onClick={() => setShowResourceModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Resource
        </Button>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Card>
          <EmptyState icon={<Link size={18} />} title="No resources found" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => {
            const CategoryIcon = getCategoryIcon(resource.category);
            return (
              <Card key={resource._id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h3 className="font-semibold text-slate-900 line-clamp-1 dark:text-slate-100">{resource.title}</h3>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(resource.category)}`}>
                        {resource.category}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-amber-500 transition-colors">
                      <Star className={`w-4 h-4 ${resource.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  {resource.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2 dark:text-slate-400">{resource.description}</p>
                  )}

                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-xs text-indigo-600 hover:underline mb-3 line-clamp-1 dark:text-indigo-400"
                  >
                    {resource.url}
                  </a>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs dark:bg-slate-800 dark:text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Updated {new Date(resource.updatedAt).toLocaleDateString()}</span>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 transition-colors dark:text-indigo-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ResourceCreationModal
        projectId={projectId}
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        onSuccess={fetchResources}
      />
    </div>
  );
}
