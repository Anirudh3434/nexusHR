"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Ticket, Search, Filter, Clock, CheckCircle, XCircle, 
  MessageSquare, ChevronDown, ChevronUp, Calendar, User,
  AlertTriangle, ArrowRight, MoreHorizontal
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
  reportedBy: { name: string; email: string };
  employeeId?: { firstName: string; lastName: string; employeeId: string; department: string };
  assignedTo?: { name: string };
  department?: string;
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

export default function TicketsManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [newComment, setNewComment] = useState("");
  const [internalComment, setInternalComment] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      fetchTickets();
    }
  }, [user?.companyId, filterStatus, filterCategory, filterPriority]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (filterPriority) params.append('priority', filterPriority);
      
      const response = await fetch(`/api/tickets?${params.toString()}`);
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load tickets" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    try {
      const body: any = { id: ticketId, status };
      if (status === 'resolved' && resolutionNotes) {
        body.resolutionNotes = resolutionNotes;
      }

      const response = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: `Ticket ${status}` });
        fetchTickets();
        setSelectedTicket(null);
        setResolutionNotes("");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
      addToast({ type: "error", title: "Error", description: "Failed to update ticket" });
    }
  };

  const handleAssign = async (ticketId: string) => {
    try {
      setAssigning(true);
      const response = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: ticketId, 
          assignedTo: user?.id,
          status: 'in_progress'
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Ticket assigned to you" });
        fetchTickets();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to assign ticket:", error);
    } finally {
      setAssigning(false);
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
          internal: internalComment,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Comment added" });
        setNewComment("");
        setInternalComment(false);
        fetchTickets();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
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
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reportedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employeeId?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employeeId?.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => t.priority === 'critical' && !['resolved', 'closed', 'cancelled'].includes(t.status)).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ticket Management</h1>
          <p className="text-sm text-gray-500">Manage and resolve employee support tickets</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'blue' },
          { label: 'Open', value: stats.open, color: 'blue' },
          { label: 'In Progress', value: stats.inProgress, color: 'yellow' },
          { label: 'Pending', value: stats.pending, color: 'orange' },
          { label: 'Resolved', value: stats.resolved, color: 'green' },
          { label: 'Critical', value: stats.critical, color: 'red' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-3">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticket #, title, reporter, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
          >
            <option value="">All Categories</option>
            <option value="it_support">IT Support</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="facilities">Facilities</option>
            <option value="hr_policy">HR Policy</option>
            <option value="payroll">Payroll</option>
            <option value="leave">Leave</option>
            <option value="attendance">Attendance</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No tickets found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket._id} className="border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Ticket Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {ticket.ticketNumber}
                      </code>
                      <Badge className={`${getStatusColor(ticket.status)} text-xs px-2 py-0.5`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-2 py-0.5 border-0`}>
                        {ticket.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {categoryLabels[ticket.category] || ticket.category}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                    
                    {/* Reporter Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {ticket.reportedBy?.name}
                      </span>
                      {ticket.employeeId?.employeeId && (
                        <span>{ticket.employeeId.employeeId}</span>
                      )}
                      {ticket.employeeId?.department && (
                        <span>{ticket.employeeId.department}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-start gap-1">
                    {ticket.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => handleAssign(ticket._id)}
                        disabled={assigning}
                        className="h-8 px-3"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-green-600 hover:bg-green-700 h-8 px-3"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
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

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {new Date(ticket.updatedAt).toLocaleDateString('en-GB')}
                  </span>
                  {ticket.assignedTo && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <User className="h-3.5 w-3.5" />
                      Assigned: {ticket.assignedTo.name}
                    </span>
                  )}
                  {ticket.comments && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ticket.comments.length} comments
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
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Resolution Notes</h4>
                        <p className="text-sm text-gray-600 bg-green-50 p-3 rounded">
                          {ticket.resolutionNotes}
                        </p>
                      </div>
                    )}

                    {/* All Comments */}
                    {ticket.comments && ticket.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Comments</h4>
                        <div className="space-y-2">
                          {ticket.comments.map((comment, idx) => (
                            <div key={idx} className={`p-3 rounded ${comment.internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {comment.authorName}
                                  {comment.internal && <span className="ml-2 text-xs text-yellow-600">(Internal)</span>}
                                </span>
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
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add Comment</h4>
                      <div className="space-y-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={internalComment}
                              onChange={(e) => setInternalComment(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            Internal comment (staff only)
                          </label>
                          <Button
                            onClick={() => handleAddComment(ticket._id)}
                            disabled={!newComment.trim()}
                            size="sm"
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resolve Ticket {selectedTicket.ticketNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTicket(null);
                    setResolutionNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!resolutionNotes.trim()}
                  onClick={() => handleStatusUpdate(selectedTicket._id, 'resolved')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Resolved
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
