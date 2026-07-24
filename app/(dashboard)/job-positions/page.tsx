"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { 
  Plus, Search, Briefcase, MapPin, Clock, DollarSign, Users,
  Edit2, Trash2, ExternalLink, Loader2, X, CheckCircle,
  Calendar, Building2, MoreVertical, Copy, Share2
} from "lucide-react";

interface JobPosition {
  _id: string;
  jobId: string;
  title: string;
  department: string;
  designation: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  experienceRequired: string;
  salaryRange: string;
  employmentType: string;
  openings: number;
  status: 'Active' | 'Closed' | 'On Hold';
  postedAt: string;
  applicationCount?: number;
}

export default function JobPositionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [linkedInContent, setLinkedInContent] = useState("");
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    designation: "",
    location: "",
    description: "",
    requirements: "",
    responsibilities: "",
    experienceRequired: "",
    salaryRange: "",
    employmentType: "Full-time",
    openings: 1,
    status: "Active" as 'Active' | 'Closed' | 'On Hold',
  });

  useEffect(() => {
    fetchPositions();
  }, [user?.companyId]);

  const fetchPositions = async () => {
    try {
      const response = await fetch(`/api/job-positions?companyId=${user?.companyId}`);
      const data = await response.json();
      
      // Fetch application counts for each position
      const positionsWithCounts = await Promise.all(
        data.map(async (position: JobPosition) => {
          if (position.jobId) {
            try {
              const appResponse = await fetch(`/api/applicants?companyId=${user?.companyId}&jobId=${position.jobId}`);
              const appData = await appResponse.json();
              return { ...position, applicationCount: appData.applications?.length || 0 };
            } catch {
              return { ...position, applicationCount: 0 };
            }
          }
          return { ...position, applicationCount: 0 };
        })
      );
      
      setPositions(positionsWithCounts);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        companyId: user?.companyId,
        requirements: formData.requirements.split("\n").filter(r => r.trim()),
        responsibilities: formData.responsibilities.split("\n").filter(r => r.trim()),
      };

      const url = editingPosition 
        ? `/api/job-positions?id=${editingPosition._id}`
        : '/api/job-positions';
      
      const response = await fetch(url, {
        method: editingPosition ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        addToast({ 
          type: "success", 
          title: "Success", 
          description: editingPosition ? "Position updated" : "Position created" 
        });
        setShowModal(false);
        setEditingPosition(null);
        resetForm();
        fetchPositions();
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to save position" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this position?")) return;
    
    try {
      const response = await fetch(`/api/job-positions?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Position deleted" });
        fetchPositions();
      }
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete position" });
    }
  };

  const handleEdit = (position: JobPosition) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      department: position.department,
      designation: position.designation,
      location: position.location,
      description: position.description,
      requirements: position.requirements.join("\n"),
      responsibilities: position.responsibilities.join("\n"),
      experienceRequired: position.experienceRequired,
      salaryRange: position.salaryRange,
      employmentType: position.employmentType,
      openings: position.openings,
      status: position.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      designation: "",
      location: "",
      description: "",
      requirements: "",
      responsibilities: "",
      experienceRequired: "",
      salaryRange: "",
      employmentType: "Full-time",
      openings: 1,
      status: "Active",
    });
  };

  const generateLinkedInPost = async (position: JobPosition) => {
    if (!position.jobId) {
      addToast({ type: "error", title: "Error", description: "Job ID not available. Please refresh the page and try again." });
      return;
    }

    setSelectedPosition(position);
    setLinkedInLoading(true);
    setShowLinkedInModal(true);

    try {
      const response = await fetch('/api/generate-linkedin-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: position.title,
          department: position.department,
          designation: position.designation,
          location: position.location,
          employmentType: position.employmentType,
          experienceRequired: position.experienceRequired,
          salaryRange: position.salaryRange,
          description: position.description,
          requirements: position.requirements,
          responsibilities: position.responsibilities,
          jobId: position.jobId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedInContent(data.content);
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "AI Generation Failed", description: error.message });
        // Fallback to template
        generateFallbackLinkedInPost(position);
      }
    } catch (error) {
      console.error('Failed to generate LinkedIn post:', error);
      addToast({ type: "error", title: "Error", description: "AI service unavailable. Using fallback template." });
      generateFallbackLinkedInPost(position);
    } finally {
      setLinkedInLoading(false);
    }
  };

  const generateFallbackLinkedInPost = (position: JobPosition) => {
    const requirements = position.requirements.slice(0, 3).map(r => `• ${r}`).join('\n');
    const content = `🚀 We're Hiring! 🚀

📢 Position: ${position.title}
🏢 Department: ${position.department}
📍 Location: ${position.location}
💼 Experience: ${position.experienceRequired}
${position.salaryRange ? `💰 Salary: ${position.salaryRange}\n` : ''}

📝 Job Description:
${position.description.substring(0, 200)}${position.description.length > 200 ? '...' : ''}

✅ Key Requirements:
${requirements}

🔹 Job ID: ${position.jobId}
⚡ To Apply: Mention Job ID "${position.jobId}" in your application email subject or apply at our careers page.

👉 Apply Now: ${careersUrl}

#Hiring #JobOpening #${position.department.replace(/\s+/g, '')} #Careers #JoinOurTeam`;

    setLinkedInContent(content);
  };

  const copyLinkedInContent = () => {
    navigator.clipboard.writeText(linkedInContent);
    addToast({ type: "success", title: "Copied!", description: "LinkedIn post content copied to clipboard" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-red-100 text-red-700';
      case 'On Hold': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredPositions = positions.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const careersUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/careers?companyId=${user?.companyId || 'webatlas'}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Job Positions</h1>
          <p className="text-sm text-gray-500">Manage job openings and recruitment</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(careersUrl).then(() => 
              addToast({ type: "success", title: "Copied", description: "Careers page URL copied to clipboard" })
            )}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Copy URL
          </Button>
          <Button 
            size="sm"
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Positions', value: positions.length, icon: Briefcase, color: 'blue' },
          { label: 'Active', value: positions.filter(p => p.status === 'Active').length, icon: CheckCircle, color: 'green' },
          { label: 'On Hold', value: positions.filter(p => p.status === 'On Hold').length, icon: Clock, color: 'yellow' },
          { label: 'Closed', value: positions.filter(p => p.status === 'Closed').length, icon: X, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md bg-${color}-50`}>
                <Icon className={`h-4 w-4 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by title, department, or designation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 text-sm border-gray-200"
        />
      </div>

      {/* Positions List */}
      <div className="space-y-3">
        {filteredPositions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No job positions</h3>
              <p className="text-gray-500">Create your first job posting to start recruiting</p>
            </CardContent>
          </Card>
        ) : (
          filteredPositions.map((position) => (
            <Card key={position._id} className="hover:shadow-sm transition-all duration-200 border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header: Title + Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{position.title}</h3>
                      <Badge className={`${getStatusColor(position.status)} text-xs font-medium px-2 py-0.5`}>
                        {position.status}
                      </Badge>
                      <span className="text-xs text-gray-500">{position.employmentType}</span>
                      {position.jobId && (
                        <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                          {position.jobId}
                        </code>
                      )}
                    </div>
                    
                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {position.experienceRequired}
                      </span>
                      {position.salaryRange && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          {position.salaryRange}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {position.openings} opening{position.openings > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(position.postedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{position.description}</p>
                    
                    {/* Requirements Tags */}
                    {position.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {position.requirements.slice(0, 4).map((req, i) => (
                          <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100">
                            {req}
                          </span>
                        ))}
                        {position.requirements.length > 4 && (
                          <span className="text-xs text-gray-400 px-1 py-1">
                            +{position.requirements.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-start gap-1">
                    {position.jobId && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/applicants?jobId=${position.jobId}`)}
                        title="View Applications"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 h-8 px-2"
                      >
                        <Briefcase className="h-4 w-4 mr-1.5" />
                        <span className="text-xs">{position.applicationCount || 0} applicants</span>
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => generateLinkedInPost(position)}
                      title={position.jobId ? "Generate LinkedIn Post" : "Job ID required"}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 h-8 w-8"
                      disabled={!position.jobId}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(position)}
                      title="Edit"
                      className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(position._id)}
                      title="Delete"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50/50 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingPosition ? 'Edit Position' : 'Create Job Position'}
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <Input
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Engineering"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                    <Input
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g., Team Lead"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <Input
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Remote, Delhi, Mumbai"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Required *</label>
                    <Input
                      required
                      value={formData.experienceRequired}
                      onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                      placeholder="e.g., 3-5 years"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                    <Input
                      value={formData.salaryRange}
                      onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                      placeholder="e.g., 8-12 LPA"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.openings}
                      onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
                  <textarea
                    required
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role, responsibilities, and what you're looking for..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requirements (one per line)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="• 3+ years of React experience&#10;• Bachelor's degree in CS&#10;• Strong communication skills"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsibilities (one per line)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    placeholder="• Develop frontend features&#10;• Code review and mentoring&#10;• Collaborate with designers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingPosition ? 'Update Position' : 'Create Position'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* LinkedIn Post Modal */}
      {showLinkedInModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                LinkedIn Post - {selectedPosition.jobId}
                {linkedInLoading && (
                  <span className="text-xs font-normal text-gray-500 ml-2 flex items-center gap-1">
                    <span className="animate-spin inline-block h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                    AI Generating...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedInLoading ? (
                <div className="bg-gray-50 p-8 rounded-lg flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                  <p className="text-sm text-gray-600">Generating LinkedIn post with AI...</p>
                  <p className="text-xs text-gray-400 mt-1">Powered by NVIDIA AI (Gemma 4-31b)</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {linkedInContent}
                  </pre>
                </div>
              )}
              
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-1">📧 Application Tracking:</p>
                <p>Candidates should include <strong>Job ID: {selectedPosition.jobId}</strong> in their email subject line when applying.</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={copyLinkedInContent} className="flex-1" disabled={linkedInLoading || !linkedInContent}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => { setShowLinkedInModal(false); setLinkedInContent(""); }}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
