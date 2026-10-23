"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import DocumentUploadModal from "@/components/projects/docs/modals/DocumentUploadModal";
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Star, 
  Search,
  Filter,
  Grid3x3,
  List,
  MoreVertical,
  Eye,
  History
} from "lucide-react";

interface DocumentsSectionProps {
  projectId: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

interface Document {
  _id: string;
  title: string;
  description?: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  version: number;
  uploadedBy: { name: string };
  uploadedAt: string;
  isFavorite: boolean;
  tags: string[];
}

export default function DocumentsSection({ projectId, searchQuery, viewMode, onViewModeChange }: DocumentsSectionProps) {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const categories = ['all', 'PRD', 'BRD', 'Technical', 'API', 'Architecture', 'Database', 'Design', 'Setup', 'Deployment', 'Manual', 'SOP', 'Meeting', 'Release', 'Testing', 'Plan', 'Other'];

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-documents?projectId=${projectId}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || doc.isFavorite;
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'PRD': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      'BRD': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      'Technical': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      'API': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
      'Architecture': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
      'Database': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
      'Design': 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      'Setup': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      'Deployment': 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      'Other': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    };
    return colors[category] || colors['Other'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500 dark:text-slate-400">Loading documents...</div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText size={18} />} title="No documents found" />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc._id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1 dark:text-slate-100">{doc.title}</h3>
                    <p className="text-xs text-slate-500 mb-2 dark:text-slate-400">{doc.fileName}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                      {doc.category}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-amber-500 transition-colors">
                    <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
                {doc.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2 dark:text-slate-400">{doc.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3 dark:text-slate-400">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>v{doc.version}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs dark:bg-slate-800 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline">
                    <History className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Document</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Version</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Uploaded</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDocuments.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-500/15">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{doc.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">v{doc.version}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-slate-700">
                          <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-slate-700">
                          <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-600'}`} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-red-600 dark:hover:bg-slate-700 dark:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <DocumentUploadModal
        projectId={projectId}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
