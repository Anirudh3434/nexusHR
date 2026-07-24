"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import NoteCreationModal from "@/components/projects/docs/modals/NoteCreationModal";
import { 
  BookOpen, 
  Plus, 
  Star, 
  Pin, 
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Clock
} from "lucide-react";

interface NotesSectionProps {
  projectId: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

interface Note {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdBy: { name: string };
  lastEditedBy: { name: string };
  updatedAt: string;
}

export default function NotesSection({ projectId, searchQuery, viewMode, onViewModeChange }: NotesSectionProps) {
  const { addToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const categories = ['all', 'Deployment', 'Coding', 'Issues', 'Guidelines', 'Decisions', 'Meeting', 'Release', 'Sprint', 'TODO', 'FAQ', 'Other'];

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-notes?projectId=${projectId}`);
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || note.isFavorite;
    const matchesPinned = !showPinnedOnly || note.isPinned;
    return matchesSearch && matchesCategory && matchesFavorites && matchesPinned;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Deployment': 'bg-blue-100 text-blue-700',
      'Coding': 'bg-emerald-100 text-emerald-700',
      'Issues': 'bg-red-100 text-red-700',
      'Guidelines': 'bg-purple-100 text-purple-700',
      'Decisions': 'bg-amber-100 text-amber-700',
      'Meeting': 'bg-pink-100 text-pink-700',
      'Release': 'bg-cyan-100 text-cyan-700',
      'Sprint': 'bg-orange-100 text-orange-700',
      'TODO': 'bg-lime-100 text-lime-700',
      'FAQ': 'bg-teal-100 text-teal-700',
      'Other': 'bg-slate-100 text-slate-700'
    };
    return colors[category] || colors['Other'];
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading notes...</div>
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
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showPinnedOnly 
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Pin className={`w-4 h-4 ${showPinnedOnly ? 'fill-indigo-500' : ''}`} />
            Pinned
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <Button onClick={() => setShowNoteModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>
      </div>

      {/* Notes Grid/List */}
      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No notes found</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card key={note._id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {note.isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{note.title}</h3>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(note.category)}`}>
                      {note.category}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-amber-500 transition-colors">
                    <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-3">{truncateContent(note.content)}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {note.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                  <span>{note.lastEditedBy.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Note</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Tags</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Updated</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredNotes.map((note) => (
                  <tr key={note._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <BookOpen className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {note.isPinned && <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
                            <p className="font-medium text-slate-900">{note.title}</p>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-1">{truncateContent(note.content, 50)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(note.category)}`}>
                        {note.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-600'}`} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-red-600">
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

      <NoteCreationModal
        projectId={projectId}
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSuccess={fetchNotes}
      />
    </div>
  );
}
