"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  Plus, Search, Edit, Trash2, Eye, EyeOff, 
  Save, X, FileText, TrendingUp, ThumbsUp, ThumbsDown 
} from 'lucide-react';

interface KnowledgeArticle {
  _id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  lastUpdated: Date;
  lastUpdatedBy?: {
    name: string;
  };
}

const categories = [
  'pto', 'holidays', 'benefits', 'handbook', 'procedures', 'payroll', 'recruitment', 'performance'
];

const categoryLabels: Record<string, string> = {
  pto: 'PTO & Leave',
  holidays: 'Holidays',
  benefits: 'Benefits',
  handbook: 'Handbook',
  procedures: 'Procedures',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  performance: 'Performance'
};

export default function KnowledgeBaseAdmin() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<KnowledgeArticle> | null>(null);
  const [formData, setFormData] = useState({
    category: 'pto',
    title: '',
    content: '',
    keywords: '',
    priority: 0,
    isActive: true
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchTerm, selectedCategory, showInactive]);

  const fetchArticles = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
      }

      const response = await fetch('/api/ai/hr/knowledge-base', { headers });
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (!showInactive) {
      filtered = filtered.filter(a => a.isActive);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(term) ||
        a.content.toLowerCase().includes(term) ||
        a.keywords.some(k => k.toLowerCase().includes(term))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
      category: 'pto',
      title: '',
      content: '',
      keywords: '',
      priority: 0,
      isActive: true
    });
    setIsEditing(true);
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      category: article.category,
      title: article.title,
      content: article.content,
      keywords: article.keywords.join(', '),
      priority: article.priority,
      isActive: article.isActive
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-user-id'] = userData.id || '';
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-role'] = userData.role || '';
      }

      const payload = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      };

      let response;
      if (editingArticle) {
        response = await fetch(`/api/ai/hr/knowledge-base/${editingArticle._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/ai/hr/knowledge-base', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        await fetchArticles();
        setIsEditing(false);
        setEditingArticle(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-role'] = userData.role || '';
      }

      const response = await fetch(`/api/ai/hr/knowledge-base/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await fetchArticles();
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
    }
  };

  const handleToggleActive = async (article: KnowledgeArticle) => {
    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-user-id'] = userData.id || '';
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-role'] = userData.role || '';
      }

      const response = await fetch(`/api/ai/hr/knowledge-base/${article._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !article.isActive })
      });

      if (response.ok) {
        await fetchArticles();
      }
    } catch (error) {
      console.error('Error toggling article:', error);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{editingArticle ? 'Edit Article' : 'Create New Article'}</span>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Article title"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Article content"
              rows={8}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Keywords (comma-separated)</label>
            <Input
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="pto, leave, vacation"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Priority (0-10)</label>
            <Input
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage HR knowledge base articles for AI assistant</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show inactive</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">Loading articles...</CardContent>
        </Card>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No articles found. Create your first article to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArticles.map((article) => (
            <Card key={article._id} className={!article.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={article.isActive ? 'default' : 'secondary'}>
                        {categoryLabels[article.category]}
                      </Badge>
                      {article.priority > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Priority: {article.priority}
                        </Badge>
                      )}
                      {!article.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {article.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {article.content}
                    </p>
                    
                    {article.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {article.keywords.slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {keyword}
                          </span>
                        ))}
                        {article.keywords.length > 3 && (
                          <span className="text-xs text-gray-500">+{article.keywords.length - 3} more</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.viewCount} views
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="w-3 h-3" />
                        {article.helpfulCount}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <ThumbsDown className="w-3 h-3" />
                        {article.notHelpfulCount}
                      </span>
                      <span>
                        Updated: {new Date(article.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(article)}
                      title={article.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {article.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(article)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(article._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
