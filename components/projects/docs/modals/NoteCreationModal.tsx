"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { X, FileText, Plus, Pin, Star, User } from "lucide-react";
import MentionInput from "@/components/projects/docs/MentionInput";

interface NoteCreationModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NoteCreationModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: NoteCreationModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "Other",
    tags: "",
    isPinned: false,
    isFavorite: false,
    assignee: "",
  });

  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);

  const categories = ["Meeting", "Decision", "Architecture", "Requirement", "Bug", "Todo", "Other"];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetch(`/api/projects/${projectId}/users`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.users) setProjectUsers(data.users);
        })
        .catch((err) => console.error("Error fetching project users:", err));
    }
  }, [isOpen, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      addToast({
        type: "error",
        title: "Validation Error",
        description: "Title and content are required",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/project-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          isPinned: formData.isPinned,
          isFavorite: formData.isFavorite,
          userId: user?.id,
          userName: user?.name,
          userEmail: user?.email,
        }),
      });

      if (response.ok) {
        addToast({
          type: "success",
          title: "Success",
          description: "Note created successfully",
        });
        setFormData({
          title: "",
          content: "",
          category: "Other",
          tags: "",
          isPinned: false,
          isFavorite: false,
          assignee: "",
        });
        onSuccess();
        onClose();
      } else {
        throw new Error("Failed to create note");
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        description: "Failed to create note",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed & Sticky */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Create Note
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Capture thoughts, requirements, and decisions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  placeholder="Note title"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Content *
              </label>
              <MentionInput
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your note here (use @ to mention team members)"
                rows={4}
                projectId={projectId}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Assignee
                </label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => {
                    setFormData({ ...formData, assignee: e.target.value });
                    setAssigneeSearch(e.target.value);
                    setShowAssigneeSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowAssigneeSuggestions(formData.assignee.length > 0)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  placeholder="Search team members..."
                />
                {showAssigneeSuggestions && projectUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
                    {user && (
                      <button
                        key="current-user"
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assignee: user.name });
                          setShowAssigneeSuggestions(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left bg-amber-50/50 border-b border-slate-100 dark:border-slate-800"
                      >
                        <div className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center text-white shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {user.name} <span className="text-amber-600 dark:text-amber-400">(me)</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                      </button>
                    )}
                    {projectUsers
                      .filter(
                        (u) =>
                          u.id !== user?.id &&
                          (u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      )
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, assignee: u.name });
                            setShowAssigneeSuggestions(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <div className="w-7 h-7 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  placeholder="comma-separated tags"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <Pin className={`w-4 h-4 ${formData.isPinned ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                <span>Pin to top</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <Star className={`w-4 h-4 ${formData.isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
                <span>Add to favorites</span>
              </label>
            </div>
          </div>

          {/* Footer - Fixed & Sticky */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-4 text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-5 text-xs h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Note</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
