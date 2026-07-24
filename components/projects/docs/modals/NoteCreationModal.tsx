"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { X, BookOpen, Plus, Pin, Star, User } from "lucide-react";
import MentionInput from "@/components/projects/docs/MentionInput";

interface NoteCreationModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NoteCreationModal({ projectId, isOpen, onClose, onSuccess }: NoteCreationModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Other',
    tags: '',
    isPinned: false,
    isFavorite: false,
    assignee: ''
  });
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [projectUsers, setProjectUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const categories = ['Deployment', 'Coding', 'Issues', 'Guidelines', 'Decisions', 'Meeting', 'Release', 'Sprint', 'TODO', 'FAQ', 'Other'];

  // Fetch project members when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchProjectMembers();
    }
  }, [isOpen, projectId]);

  const fetchProjectMembers = async () => {
    try {
      console.log('Fetching project members for projectId:', projectId);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;
      if (user?.companyId) headers['x-company-id'] = user.companyId;

      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers
      });
      const data = await response.json();
      console.log('Project members response:', data);
      setProjectUsers(data.members || []);
    } catch (error) {
      console.error('Error fetching project members:', error);
      setProjectUsers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Title and content are required' });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/project-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          isPinned: formData.isPinned,
          isFavorite: formData.isFavorite,
          userId: user?.id,
          userName: user?.name,
          userEmail: user?.email
        })
      });

      if (response.ok) {
        addToast({ type: 'success', title: 'Success', description: 'Note created successfully' });
        setFormData({ title: '', content: '', category: 'Other', tags: '', isPinned: false, isFavorite: false, assignee: '' });
        onSuccess();
        onClose();
      } else {
        throw new Error('Failed to create note');
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to create note' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl max-w-5xl w-full animate-in scale-in-95 duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-900">Create Note</CardTitle>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  placeholder="Note title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
              <MentionInput
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your note here (use @ to mention team members)"
                rows={4}
                projectId={projectId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Assignee</label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => {
                    setFormData({ ...formData, assignee: e.target.value });
                    setAssigneeSearch(e.target.value);
                    setShowAssigneeSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowAssigneeSuggestions(formData.assignee.length > 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  placeholder="Search team members..."
                />
                {showAssigneeSuggestions && projectUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Show current user at top with "me" label */}
                    {user && (
                      <button
                        key="current-user"
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assignee: user.name });
                          setShowAssigneeSuggestions(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-indigo-50 transition-colors text-left bg-indigo-50/50 border-b border-slate-100"
                      >
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{user.name} <span className="text-indigo-600 font-normal">(me)</span></p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </button>
                    )}
                    {projectUsers
                      .filter(user => 
                        user.id !== user?.id && // Exclude current user from the list
                        (user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                        user.email.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      )
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, assignee: user.name });
                            setShowAssigneeSuggestions(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isPinned" className="text-sm text-slate-700 flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  Pin
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFavorite"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isFavorite" className="text-sm text-slate-700 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Favorite
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Note
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
