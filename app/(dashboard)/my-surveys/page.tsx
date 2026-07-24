"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, CheckCircle, Clock, Calendar, Send, 
  Star, ChevronRight, ChevronDown, AlertCircle
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
  isAnonymous: boolean;
  startDate?: string;
  endDate?: string;
  showResultsToEmployees: boolean;
  createdAt: string;
  createdBy: { name: string };
}

interface SurveyResponseItem {
  _id: string;
  responseNumber: string;
  surveyId: { _id: string; title: string; type: string; isAnonymous: boolean };
  submittedAt: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string | string[] | number;
  }>;
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

export default function MySurveysPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [availableSurveys, setAvailableSurveys] = useState<SurveyItem[]>([]);
  const [myResponses, setMyResponses] = useState<SurveyResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);
  const [showTakeSurveyModal, setShowTakeSurveyModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseItem | null>(null);

  useEffect(() => {
    if (user?.companyId) {
      fetchData();
    }
  }, [user?.companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [surveysRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys?activeOnly=true`),
        fetch(`/api/survey-responses`),
      ]);
      
      const surveysData = await surveysRes.json();
      const responsesData = await responsesRes.json();
      
      setAvailableSurveys(surveysData.surveys || []);
      setMyResponses(responsesData.responses || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load surveys" });
    } finally {
      setLoading(false);
    }
  };

  const handleTakeSurvey = (survey: SurveyItem) => {
    setSelectedSurvey(survey);
    setShowTakeSurveyModal(true);
  };

  const handleViewResults = (response: SurveyResponseItem) => {
    setSelectedResponse(response);
    setShowResultsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Surveys</h1>
        <p className="text-gray-600 mt-1">Participate in company surveys and view your responses</p>
      </div>

      {/* Available Surveys */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Available Surveys ({availableSurveys.length})
        </h2>
        {availableSurveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active surveys available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {availableSurveys.map((survey) => {
              const hasResponded = myResponses.some(r => r.surveyId._id === survey._id);
              const isExpired = survey.endDate && new Date() > new Date(survey.endDate);
              
              return (
                <Card key={survey._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                          <Badge variant="outline">
                            {typeLabels[survey.type]}
                          </Badge>
                          {survey.isAnonymous && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              Anonymous
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge className="bg-red-100 text-red-800">
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{survey.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {survey.questions.length} questions
                          </span>
                          {survey.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Due: {new Date(survey.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasResponded ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        ) : isExpired ? (
                          <Button disabled variant="outline">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Expired
                          </Button>
                        ) : (
                          <Button onClick={() => handleTakeSurvey(survey)}>
                            <Send className="w-4 h-4 mr-2" />
                            Take Survey
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* My Responses */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          My Responses ({myResponses.length})
        </h2>
        {myResponses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">You haven't responded to any surveys yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myResponses.map((response) => (
              <Card key={response._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {response.surveyId.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Submitted: {new Date(response.submittedAt).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">
                          {typeLabels[response.surveyId.type]}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleViewResults(response)}
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      View Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Take Survey Modal */}
      {showTakeSurveyModal && selectedSurvey && (
        <TakeSurveyModal
          survey={selectedSurvey}
          onClose={() => {
            setShowTakeSurveyModal(false);
            setSelectedSurvey(null);
          }}
          onSuccess={() => {
            setShowTakeSurveyModal(false);
            setSelectedSurvey(null);
            fetchData();
          }}
        />
      )}

      {/* View Results Modal */}
      {showResultsModal && selectedResponse && (
        <ViewResultsModal
          response={selectedResponse}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedResponse(null);
          }}
        />
      )}
    </div>
  );
}

// Take Survey Modal Component
function TakeSurveyModal({ 
  survey, 
  onClose, 
  onSuccess 
}: { 
  survey: SurveyItem; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});

  const handleAnswerChange = (questionId: string, value: string | string[] | number) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required questions
    const requiredQuestions = survey.questions.filter(q => q.required);
    const missingAnswers = requiredQuestions.filter(q => !answers[q.id]);
    
    if (missingAnswers.length > 0) {
      addToast({ 
        type: "error", 
        title: "Error", 
        description: `Please answer all required questions (${missingAnswers.length} remaining)` 
      });
      return;
    }

    try {
      setLoading(true);
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);
      
      const formattedAnswers = survey.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id] || '',
        questionType: q.type,
      }));

      const response = await fetch('/api/survey-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey._id,
          answers: formattedAnswers,
          timeToComplete,
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Survey response submitted successfully" });
        onSuccess();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message || "Failed to submit response" });
      }
    } catch (error) {
      console.error("Failed to submit response:", error);
      addToast({ type: "error", title: "Error", description: "Failed to submit response" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{survey.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {survey.questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-700 mt-1">{index + 1}.</span>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {question.type === 'text' && (
                    <textarea
                      value={answers[question.id] as string || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      required={question.required}
                    />
                  )}
                  
                  {question.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleAnswerChange(question.id, rating)}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            answers[question.id] === rating
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Star className={`w-5 h-5 ${answers[question.id] === rating ? 'fill-blue-500 text-blue-500' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="rounded"
                            required={question.required}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'checkbox' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            value={option}
                            checked={(answers[question.id] as string[] || []).includes(option)}
                            onChange={(e) => {
                              const current = answers[question.id] as string[] || [];
                              if (e.target.checked) {
                                handleAnswerChange(question.id, [...current, option]);
                              } else {
                                handleAnswerChange(question.id, current.filter(v => v !== option));
                              }
                            }}
                            className="rounded"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'yes_no' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value="yes"
                          checked={answers[question.id] === 'yes'}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="rounded"
                          required={question.required}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value="no"
                          checked={answers[question.id] === 'no'}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="rounded"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  )}
                  
                  {question.type === 'dropdown' && question.options && (
                    <select
                      value={answers[question.id] as string || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={question.required}
                    >
                      <option value="">Select an option</option>
                      {question.options.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Response'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Results Modal Component
function ViewResultsModal({ 
  response, 
  onClose 
}: { 
  response: SurveyResponseItem; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{response.surveyId.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Submitted on {new Date(response.submittedAt).toLocaleString()}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {response.answers.map((answer, index) => (
            <div key={answer.questionId} className="border rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-700 mt-1">{index + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">{answer.questionText}</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {Array.isArray(answer.answer) ? (
                      <div className="flex flex-wrap gap-2">
                        {answer.answer.map((a, idx) => (
                          <Badge key={idx} variant="outline">{a}</Badge>
                        ))}
                      </div>
                    ) : typeof answer.answer === 'number' ? (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${star <= (answer.answer as number) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-700">{answer.answer || 'Not answered'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-6 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
