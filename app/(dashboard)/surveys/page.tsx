"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, Search, Filter, Clock, CheckCircle, XCircle, 
  Plus, Calendar, Users, Eye, Edit, Trash2, ChevronDown,
  ChevronUp, BarChart3, Send
} from "lucide-react";

interface SurveyItem {
  _id: string;
  surveyNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  targetDepartments: string[];
  targetEmployees: Array<{ name: string }>;
  isAnonymous: boolean;
  startDate?: string;
  endDate?: string;
  totalSent: number;
  totalResponses: number;
  responseRate: number;
  createdAt: string;
  createdBy: { name: string; email: string };
}

const typeLabels: Record<string, string> = {
  engagement: 'Engagement',
  pulse: 'Pulse',
  feedback: 'Feedback',
  onboarding: 'Onboarding',
  exit: 'Exit',
  training: 'Training',
  performance: 'Performance',
  custom: 'Custom',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-600',
};

export default function SurveysManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);

  useEffect(() => {
    if (user?.companyId) {
      fetchSurveys();
    }
  }, [user?.companyId, filterStatus, filterType]);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);
      
      const response = await fetch(`/api/surveys?${params.toString()}`);
      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load surveys" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (surveyId: string, status: string) => {
    try {
      const response = await fetch('/api/surveys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: surveyId, status }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: `Survey ${status} successfully` });
        fetchSurveys();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message || "Failed to update survey" });
      }
    } catch (error) {
      console.error("Failed to update survey:", error);
      addToast({ type: "error", title: "Error", description: "Failed to update survey" });
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;
    
    try {
      const response = await fetch(`/api/surveys?id=${surveyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Survey deleted successfully" });
        fetchSurveys();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message || "Failed to delete survey" });
      }
    } catch (error) {
      console.error("Failed to delete survey:", error);
      addToast({ type: "error", title: "Error", description: "Failed to delete survey" });
    }
  };

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         survey.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
          <p className="text-gray-600 mt-1">Create and manage employee surveys</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Survey
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search surveys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="engagement">Engagement</option>
              <option value="pulse">Pulse</option>
              <option value="feedback">Feedback</option>
              <option value="onboarding">Onboarding</option>
              <option value="exit">Exit</option>
              <option value="training">Training</option>
              <option value="performance">Performance</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Surveys List */}
      <div className="space-y-4">
        {filteredSurveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No surveys found</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                Create Your First Survey
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredSurveys.map((survey) => (
            <Card key={survey._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                      <Badge className={statusColors[survey.status]}>
                        {statusLabels[survey.status]}
                      </Badge>
                      <Badge variant="outline">
                        {typeLabels[survey.type]}
                      </Badge>
                      {survey.isAnonymous && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Anonymous
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{survey.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {survey.surveyNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {survey.totalResponses} / {survey.totalSent} responses
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {survey.responseRate.toFixed(1)}% response rate
                      </span>
                      {survey.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ends: {new Date(survey.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSurvey(survey);
                        setShowViewModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {survey.totalResponses > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSurvey(survey);
                          setShowAnalyticsModal(true);
                        }}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    )}
                    {survey.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(survey._id, 'active')}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {survey.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(survey._id, 'closed')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(survey._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Survey Modal */}
      {showCreateModal && (
        <CreateSurveyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSurveys();
          }}
        />
      )}

      {/* View Survey Modal */}
      {showViewModal && selectedSurvey && (
        <ViewSurveyModal
          survey={selectedSurvey}
          onClose={() => {
            setShowViewModal(false);
            setSelectedSurvey(null);
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedSurvey && (
        <AnalyticsModal
          survey={selectedSurvey}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedSurvey(null);
          }}
        />
      )}
    </div>
  );
}

// Create Survey Modal Component
function CreateSurveyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom',
    isAnonymous: false,
    allowMultipleResponses: false,
    showResultsToEmployees: false,
    startDate: '',
    endDate: '',
    questions: [] as Array<{
      id: string;
      text: string;
      type: string;
      required: boolean;
      options: string[];
      order: number;
    }>,
  });

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      text: '',
      type: 'text',
      required: true,
      options: [],
      order: formData.questions.length,
    };
    setFormData({ ...formData, questions: [...formData.questions, newQuestion] });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || formData.questions.length === 0) {
      addToast({ type: "error", title: "Error", description: "Title and at least one question are required" });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Survey created successfully" });
        onSuccess();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message || "Failed to create survey" });
      }
    } catch (error) {
      console.error("Failed to create survey:", error);
      addToast({ type: "error", title: "Error", description: "Failed to create survey" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Create New Survey</h2>
            <Button variant="ghost" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="custom">Custom</option>
                <option value="engagement">Engagement</option>
                <option value="pulse">Pulse</option>
                <option value="feedback">Feedback</option>
                <option value="onboarding">Onboarding</option>
                <option value="exit">Exit</option>
                <option value="training">Training</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Anonymous</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowMultipleResponses}
                  onChange={(e) => setFormData({ ...formData, allowMultipleResponses: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Allow Multiple Responses</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Questions</h3>
              <Button type="button" onClick={addQuestion} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
            
            {formData.questions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No questions added yet</p>
            ) : (
              <div className="space-y-4">
                {formData.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700">Question {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter question text"
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div className="flex gap-4">
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="text">Text</option>
                        <option value="rating">Rating (1-5)</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="yes_no">Yes/No</option>
                        <option value="dropdown">Dropdown</option>
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                    {['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Option 1, Option 2, Option 3"
                          onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(o => o.trim()))}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Survey'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Survey Modal Component
function ViewSurveyModal({ survey, onClose }: { survey: SurveyItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{survey.title}</h2>
            <Button variant="ghost" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Survey Number:</span>
              <p className="font-medium">{survey.surveyNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <p className="font-medium">{typeLabels[survey.type]}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium">{statusLabels[survey.status]}</p>
            </div>
            <div>
              <span className="text-gray-500">Anonymous:</span>
              <p className="font-medium">{survey.isAnonymous ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-gray-500">Responses:</span>
              <p className="font-medium">{survey.totalResponses} / {survey.totalSent}</p>
            </div>
            <div>
              <span className="text-gray-500">Response Rate:</span>
              <p className="font-medium">{survey.responseRate.toFixed(1)}%</p>
            </div>
            {survey.startDate && (
              <div>
                <span className="text-gray-500">Start Date:</span>
                <p className="font-medium">{new Date(survey.startDate).toLocaleDateString()}</p>
              </div>
            )}
            {survey.endDate && (
              <div>
                <span className="text-gray-500">End Date:</span>
                <p className="font-medium">{new Date(survey.endDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {survey.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{survey.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Questions ({survey.questions.length})</h3>
            <div className="space-y-3">
              {survey.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{question.text}</p>
                      <div className="flex gap-2 mt-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">{question.type}</span>
                        {question.required && <span className="bg-red-50 text-red-600 px-2 py-1 rounded">Required</span>}
                      </div>
                      {question.options && question.options.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Options: {question.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Modal Component
function AnalyticsModal({ survey, onClose }: { survey: SurveyItem; onClose: () => void }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [survey._id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/surveys/${survey._id}/analytics`);
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load analytics" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Survey Analytics</h2>
              <p className="text-sm text-gray-600 mt-1">{survey.title}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Total Responses</div>
                <div className="text-2xl font-bold">{analytics.totalResponses || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Total Sent</div>
                <div className="text-2xl font-bold">{analytics.totalSent || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Response Rate</div>
                <div className="text-2xl font-bold">{analytics.responseRate ? analytics.responseRate.toFixed(1) : 0}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Question Analytics */}
          <div>
            <h3 className="font-semibold mb-4">Question Breakdown</h3>
            <div className="space-y-4">
              {analytics.questionAnalytics && analytics.questionAnalytics.length > 0 ? (
                analytics.questionAnalytics.map((qa: any, index: number) => (
                <Card key={qa.questionId}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium">{qa.questionText}</p>
                        <div className="flex gap-2 mt-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">{qa.questionType}</span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{qa.answeredCount} answered</span>
                          {qa.skipCount > 0 && (
                            <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded">{qa.skipCount} skipped</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Type-specific visualizations */}
                    {qa.questionType === 'rating' && qa.averageRating && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">Average Rating:</span>
                          <span className="text-lg font-bold text-blue-600">{qa.averageRating}</span>
                        </div>
                        <div className="space-y-2">
                          {qa.distribution.map((d: any) => (
                            <div key={d.star} className="flex items-center gap-2">
                              <span className="text-sm w-8">{d.star}★</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div
                                  className="bg-blue-500 h-4 rounded-full transition-all"
                                  style={{ width: `${d.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm w-12 text-right">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {['multiple_choice', 'dropdown'].includes(qa.questionType) && qa.optionCounts && (
                      <div className="mt-4 space-y-2">
                        {qa.optionCounts.map((oc: any) => (
                          <div key={oc.option} className="flex items-center gap-2">
                            <span className="text-sm flex-1">{oc.option}</span>
                            <div className="w-32 bg-gray-200 rounded-full h-4">
                              <div
                                className="bg-green-500 h-4 rounded-full transition-all"
                                style={{ width: `${oc.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm w-12 text-right">{oc.percentage.toFixed(1)}%</span>
                            <span className="text-sm w-12 text-right">({oc.count})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {qa.questionType === 'checkbox' && qa.optionCounts && (
                      <div className="mt-4 space-y-2">
                        {qa.optionCounts.map((oc: any) => (
                          <div key={oc.option} className="flex items-center gap-2">
                            <span className="text-sm flex-1">{oc.option}</span>
                            <div className="w-32 bg-gray-200 rounded-full h-4">
                              <div
                                className="bg-purple-500 h-4 rounded-full transition-all"
                                style={{ width: `${oc.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm w-12 text-right">{oc.percentage.toFixed(1)}%</span>
                            <span className="text-sm w-12 text-right">({oc.count})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {qa.questionType === 'yes_no' && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{qa.yesCount}</div>
                          <div className="text-sm text-gray-600">Yes ({qa.yesPercentage.toFixed(1)}%)</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{qa.noCount}</div>
                          <div className="text-sm text-gray-600">No ({qa.noPercentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                    )}

                    {qa.questionType === 'text' && qa.sampleResponses && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-2">
                          Sample responses ({qa.totalTextResponses} total)
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {qa.sampleResponses.map((response: string, idx: number) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                              "{response}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No question analytics available
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
