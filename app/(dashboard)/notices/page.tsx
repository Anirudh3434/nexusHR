"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getNotices, createNotice, deleteNotice, Notice } from "../../../services/noticeService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Plus, X, AlertCircle, Megaphone, Trash2 } from "lucide-react";

export default function NoticesPage() {
  const { user, loading, hasRole } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    priority: 'Medium',
    expiryDate: '',
  });

  useEffect(() => {
    if (!loading && user && !hasRole(["admin", "hr"])) {
      router.push("/unauthorized");
    }
  }, [user, loading, hasRole, router]);

  useEffect(() => {
    if (user && hasRole(["admin", "hr"])) {
      fetchNotices();
    }
  }, [user]);

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      if (user?.companyId) {
        const data = await getNotices({ companyId: user.companyId, limit: 50 });
        setNotices(data);
      }
    } catch (error) {
      console.error("Failed to fetch notices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) {
      addToast({ type: 'error', title: 'Error', description: 'Company information missing' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createNotice({
        companyId: user.companyId,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        postedBy: user.id,
        expiryDate: formData.expiryDate || undefined,
      });
      
      addToast({ type: 'success', title: 'Success', description: 'Notice posted successfully' });
      setShowModal(false);
      setFormData({ title: '', content: '', category: 'General', priority: 'Medium', expiryDate: '' });
      fetchNotices();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to post notice' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    
    setIsDeleting(id);
    try {
      await deleteNotice(id);
      addToast({ type: 'success', title: 'Success', description: 'Notice deleted' });
      fetchNotices();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to delete notice' });
    } finally {
      setIsDeleting(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Urgent': return 'bg-red-100 text-red-700';
      case 'Holiday': return 'bg-green-100 text-green-700';
      case 'Event': return 'bg-purple-100 text-purple-700';
      case 'Policy': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-blue-600" />
            Notice Management
          </h1>
          <p className="text-gray-500">Create and manage company announcements.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Post Notice
        </Button>
      </div>

      {/* Notices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Notices</CardTitle>
          <CardDescription>Active and recent company announcements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notices found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first notice to announce something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div key={notice.id} className={`border rounded-lg p-4 ${getPriorityColor(notice.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{notice.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(notice.category)}`}>
                          {notice.category}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded border">
                          {notice.priority} Priority
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{notice.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Posted by {notice.postedBy?.name || 'Admin'}</span>
                        <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                        {notice.expiryDate && (
                          <span>Expires: {new Date(notice.expiryDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(notice.id)}
                      disabled={isDeleting === notice.id}
                    >
                      {isDeleting === notice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Post New Notice</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter notice title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Enter notice content..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Policy">Policy</option>
                    <option value="Event">Event</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Notice will be hidden after this date</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Notice'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
