"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Ticket, Plus, Clock, AlertCircle, CheckCircle, XCircle, 
  MessageSquare, ChevronDown, ChevronUp, Calendar, Paperclip,
  AlertTriangle, Info
} from "lucide-react";

interface TicketItem {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { name: string };
  resolutionNotes?: string;
  comments?: {
    authorName: string;
    message: string;
    createdAt: string;
    internal: boolean;
  }[];
}

const categoryLabels: Record<string, string> = {
  it_support: 'IT Support',
  hardware: 'Hardware',
  software: 'Software',
  facilities: 'Facilities',
  hr_policy: 'HR Policy',
  payroll: 'Payroll',
  leave: 'Leave',
  attendance: 'Attendance',
  other: 'Other',
};

const categoryOptions = [
  { value: 'it_support', label: 'IT Support' },
  { value: 'hardware', label: 'Hardware Issue' },
  { value: 'software', label: 'Software Issue' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'hr_policy', label: 'HR Policy' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'leave', label: 'Leave Issue' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function MyTicketsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets?myTickets=true');
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !category) {
      addToast({ type: "error", title: "Error", description: "Please fill all required fields" });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          companyId: user?.companyId,
          department: user?.department,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({ type: "success", title: "Success", description: `Ticket ${data.ticket.ticketNumber} created` });
        setTickets([data.ticket, ...tickets]);
        setShowForm(false);
        // Reset form
        setTitle("");
        setDescription("");
        setCategory("");
        setPriority("medium");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
      addToast({ type: "error", title: "Error", description: "Failed to create ticket" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (ticketId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/tickets/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          message: newComment,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Comment added" });
        setNewComment("");
        fetchTickets();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;

    try {
      const response = await fetch(`/api/tickets?id=${ticketId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Ticket cancelled" });
        fetchTickets();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to cancel ticket:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500">Report issues and track your support requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {showForm ? 'Cancel' : 'New Ticket'}
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showForm && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create New Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed information about the issue..."
                  maxLength={5000}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{description.length}/5000 characters</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: tickets.filter(t => t.status === 'open').length, color: 'blue' },
          { label: 'In Progress', value: tickets.filter(t => t.status === 'in_progress').length, color: 'yellow' },
          { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, color: 'green' },
          { label: 'Total', value: tickets.length, color: 'gray' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-3">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No tickets yet</h3>
              <p className="text-gray-500 text-sm">Create a ticket to report an issue</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket._id} className="border-gray-200 overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {ticket.ticketNumber}
                      </code>
                      <Badge className={`${getStatusColor(ticket.status)} text-xs px-2 py-0.5`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <span className={`text-xs flex items-center gap-1 ${getPriorityColor(ticket.priority)}`}>
                        {getPriorityIcon(ticket.priority)}
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                    <p className="text-sm text-gray-500">{categoryLabels[ticket.category] || ticket.category}</p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {['open', 'pending', 'in_progress'].includes(ticket.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTicket(ticket._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(ticket._id)}
                      className="text-gray-500 h-8 px-2"
                    >
                      {expandedId === ticket._id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Created: {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Updated: {new Date(ticket.updatedAt).toLocaleDateString('en-GB')}
                  </span>
                  {ticket.assignedTo && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Assigned to: {ticket.assignedTo.name}
                    </span>
                  )}
                  {ticket.comments && ticket.comments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ticket.comments.filter(c => !c.internal).length} comments
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === ticket._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                        {ticket.description}
                      </p>
                    </div>

                    {ticket.resolutionNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Resolution</h4>
                        <p className="text-sm text-gray-600 bg-green-50 p-3 rounded">
                          {ticket.resolutionNotes}
                        </p>
                      </div>
                    )}

                    {/* Comments */}
                    {ticket.comments && ticket.comments.filter(c => !c.internal).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Comments</h4>
                        <div className="space-y-2">
                          {ticket.comments.filter(c => !c.internal).map((comment, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Comment */}
                    {['open', 'in_progress', 'pending'].includes(ticket.status) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Add Comment</h4>
                        <div className="flex gap-2">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            rows={2}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <Button
                            onClick={() => handleAddComment(ticket._id)}
                            disabled={!newComment.trim()}
                            className="self-end"
                          >
                            Post
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
