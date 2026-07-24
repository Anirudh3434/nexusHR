"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
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
      'Design': 'bg-pink-100 text-pink-700',
      'ProjectManagement': 'bg-blue-100 text-blue-700',
      'API': 'bg-orange-100 text-orange-700',
      'Documentation': 'bg-emerald-100 text-emerald-700',
      'CI/CD': 'bg-purple-100 text-purple-700',
      'Monitoring': 'bg-cyan-100 text-cyan-700',
      'Hosting': 'bg-amber-100 text-amber-700',
      'Cloud': 'bg-indigo-100 text-indigo-700',
      'Domain': 'bg-teal-100 text-teal-700',
      'Other': 'bg-slate-100 text-slate-700'
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
        <div className="text-slate-500">Loading resources...</div>
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
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showFavoritesOnly 
                ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
          <CardContent className="p-12 text-center">
            <Link className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No resources found</p>
          </CardContent>
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
                        <CategoryIcon className="w-4 h-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{resource.title}</h3>
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
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{resource.description}</p>
                  )}

                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-xs text-indigo-600 hover:underline mb-3 line-clamp-1"
                  >
                    {resource.url}
                  </a>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Updated {new Date(resource.updatedAt).toLocaleDateString()}</span>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 transition-colors"
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
