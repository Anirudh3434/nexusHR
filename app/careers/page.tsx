"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Briefcase, MapPin, Clock, DollarSign, Users, 
  ChevronDown, ChevronUp, Send, CheckCircle, Loader2,
  Building2, FileText, Mail, User, Phone, ExternalLink,
  Sparkles, ArrowRight
} from "lucide-react";
import { getContentConfig, ContentConfig } from "@/services/contentConfigService";
import { DEFAULT_CAREERS, fillTemplateText } from "@/lib/emailTemplatesMeta";
import { CareersOverride } from "@/models/CompanyContentConfig";

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
}

function CareersContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId") || "webatlas";
  
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [careers, setCareers] = useState<Partial<CareersOverride>>({});
  const [companyIdForConfig, setCompanyIdForConfig] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    currentDesignation: "",
    expectedSalary: "",
    noticePeriod: "",
    skills: "",
    coverLetter: "",
    resume: null as File | null,
  });

  // Career email - can be configured per company
  const careerEmail = companyInfo?.careerEmail || "careers@company.com";

  const mergedCareers: CareersOverride = { ...DEFAULT_CAREERS, ...careers };

  const palette = {
    primary: mergedCareers.primaryColor || DEFAULT_CAREERS.primaryColor || "#0f172a",
    secondary: mergedCareers.secondaryColor || DEFAULT_CAREERS.secondaryColor || "#64748b",
    accent: mergedCareers.accentColor || DEFAULT_CAREERS.accentColor || "#2563eb",
    background: mergedCareers.backgroundColor || DEFAULT_CAREERS.backgroundColor || "#f8fafc",
    text: mergedCareers.textColor || DEFAULT_CAREERS.textColor || "#64748b",
    header: mergedCareers.headerColor || DEFAULT_CAREERS.headerColor || "#ffffff",
    button: mergedCareers.buttonColor || DEFAULT_CAREERS.buttonColor || "#0f172a",
  };

  useEffect(() => {
    fetchPositions();
    fetchCompanyInfo();
  }, [companyId]);

  useEffect(() => {
    if (!companyIdForConfig) return;
    fetchCareersConfig();
  }, [companyIdForConfig]);

  const fetchCareersConfig = async () => {
    try {
      const data = await getContentConfig(companyIdForConfig);
      setCareers(data.careers || {});
    } catch (error) {
      console.error("Failed to fetch careers config:", error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch(`/api/job-positions?companyId=${companyId}&public=true`);
      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`/api/company/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
        if (data.company?.id) setCompanyIdForConfig(data.company.id);
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    }
  };

  const applyOnlineDesc = fillTemplateText(mergedCareers.applyOnlineDesc || '', { careerEmail });
  const applyEmailDesc = fillTemplateText(mergedCareers.applyEmailDesc || '', { careerEmail });

  const handleApply = async (e: React.FormEvent, positionId: string) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("companyId", companyId);
      formDataToSend.append("jobPositionId", positionId);
      formDataToSend.append("candidateName", formData.name);
      formDataToSend.append("fromEmail", formData.email);
      formDataToSend.append("candidatePhone", formData.phone);
      formDataToSend.append("experience", formData.experience);
      formDataToSend.append("currentDesignation", formData.currentDesignation);
      formDataToSend.append("expectedSalary", formData.expectedSalary);
      formDataToSend.append("noticePeriod", formData.noticePeriod);
      formDataToSend.append("skills", formData.skills);
      formDataToSend.append("coverLetter", formData.coverLetter);
      formDataToSend.append("appliedPosition", positions.find(p => p._id === positionId)?.title || "");
      
      if (formData.resume) {
        formDataToSend.append("resume", formData.resume);
      }

      const response = await fetch("/api/apply-job", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setApplyingId(null);
          setSubmitted(false);
          setFormData({
            name: "",
            email: "",
            phone: "",
            experience: "",
            currentDesignation: "",
            expectedSalary: "",
            noticePeriod: "",
            skills: "",
            coverLetter: "",
            resume: null,
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to submit application:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      {/* Header - Professional & Subtle */}
      <div className="border-b" style={{ backgroundColor: palette.header, borderColor: palette.secondary + "33" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-6">
            <div
              className="flex items-center gap-2 text-white px-4 py-2 rounded-full"
              style={{ backgroundColor: palette.primary }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium tracking-wide">{mergedCareers.brandText || "WE MADE CAREERS"}</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ color: palette.primary }}>
            {mergedCareers.heroTitle || "Join Our Team"}
          </h1>
          <p className="text-lg max-w-2xl leading-relaxed" style={{ color: palette.text }}>
            {mergedCareers.heroSubtitle || "We believe in nurturing talent and creating opportunities for growth. Explore our open positions and take the next step in your career journey."}
          </p>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: palette.primary }}>
            {mergedCareers.openPositionsTitle || "Open Positions"} ({positions.length})
          </h2>
          <p className="mt-1" style={{ color: palette.text }}>
            {mergedCareers.openPositionsSubtitle || "Browse our current job openings and apply today"}
          </p>
        </div>

        {positions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No open positions</h3>
              <p className="text-gray-500">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <Card key={position._id} className="overflow-hidden">
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === position._id ? null : position._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold" style={{ color: palette.primary }}>
                          {position.title}
                        </h3>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {position.employmentType}
                        </Badge>
                        {position.jobId && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                            ID: {position.jobId}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm mb-3" style={{ color: palette.text }}>
                        <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                          {position.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {position.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {position.experienceRequired}
                        </span>
                        {position.salaryRange && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {position.salaryRange}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {position.openings} opening{position.openings > 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <p className="line-clamp-2 text-gray-700">
                        {position.description}
                      </p>
                    </div>
                    
                    <div className="ml-4">
                      {expandedId === position._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === position._id && (
                  <div className="border-t px-6 py-6 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: palette.primary }}>
                          <FileText className="h-4 w-4" />
                          Requirements
                        </h4>
                        <ul className="space-y-2">
                          {position.requirements.map((req, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700">
                              <span style={{ color: palette.accent }}>•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: palette.primary }}>
                          <Briefcase className="h-4 w-4" />
                          Responsibilities
                        </h4>
                        <ul className="space-y-2">
                          {position.responsibilities.map((resp, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700">
                              <span style={{ color: palette.accent }}>•</span>
                              {resp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div className="mt-6">
                      {applyingId === position._id ? (
                        <Card className="bg-white">
                          <CardHeader>
                            <CardTitle className="text-slate-900">Apply for {position.title}</CardTitle>
                            {position.jobId && (
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700 mt-3">
                                <p className="font-medium mb-1">📌 Application Tracking</p>
                                <p className="text-slate-600">Job ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border">{position.jobId}</strong></p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Include this ID in your application to help us track your application accurately.
                                </p>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            {submitted ? (
                              <div className="text-center py-8">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                  Application Submitted!
                                </h3>
                                <p className="text-gray-600">
                                  Thank you for applying. Our HR team will review your application.
                                </p>
                              </div>
                            ) : (
                              <form onSubmit={(e) => handleApply(e, position._id)} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <User className="h-4 w-4 inline mr-1" />
                                      Full Name *
                                    </label>
                                    <Input
                                      required
                                      value={formData.name}
                                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                      placeholder="John Doe"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <Mail className="h-4 w-4 inline mr-1" />
                                      Email *
                                    </label>
                                    <Input
                                      type="email"
                                      required
                                      value={formData.email}
                                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                      placeholder="john@example.com"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <Phone className="h-4 w-4 inline mr-1" />
                                      Phone *
                                    </label>
                                    <Input
                                      required
                                      value={formData.phone}
                                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                      placeholder="+91 98765 43210"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <Clock className="h-4 w-4 inline mr-1" />
                                      Experience *
                                    </label>
                                    <Input
                                      required
                                      value={formData.experience}
                                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                      placeholder="3 years"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <Briefcase className="h-4 w-4 inline mr-1" />
                                      Current Designation
                                    </label>
                                    <Input
                                      value={formData.currentDesignation}
                                      onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
                                      placeholder="Software Engineer"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      <DollarSign className="h-4 w-4 inline mr-1" />
                                      Expected Salary
                                    </label>
                                    <Input
                                      value={formData.expectedSalary}
                                      onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                                      placeholder="8-10 LPA"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Notice Period
                                    </label>
                                    <Input
                                      value={formData.noticePeriod}
                                      onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                                      placeholder="30 days"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Skills (comma separated)
                                    </label>
                                    <Input
                                      value={formData.skills}
                                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                      placeholder="React, Node.js, Python"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cover Letter
                                  </label>
                                  <textarea
                                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                                    value={formData.coverLetter}
                                    onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                                    placeholder="Tell us why you're a great fit for this role..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Resume (PDF/DOC) *
                                  </label>
                                  <Input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    required
                                    onChange={(e) => setFormData({ ...formData, resume: e.target.files?.[0] || null })}
                                  />
                                </div>

                                {/* Apply Options */}
                                <div className="border-t pt-4 mt-4">
                                  <p className="text-sm text-slate-600 mb-3 text-center">Choose how you want to apply:</p>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <Button 
                                      type="submit" 
                                      style={{ backgroundColor: palette.button }}
                                      className="flex-1 hover:opacity-90"
                                      disabled={submitting}
                                    >
                                      {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                      )}
                                      {submitting ? "Submitting..." : "Apply Online"}
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant="outline"
                                      onClick={() => setApplyingId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </form>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button 
                            size="lg" 
                            onClick={() => setApplyingId(position._id)}
                            style={{ backgroundColor: palette.button }}
                            className="flex-1 hover:opacity-90"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Apply Online
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                          {position.jobId && (
                            <Button 
                              size="lg" 
                              variant="outline"
                              onClick={() => window.location.href = `mailto:${careerEmail}?subject=Application for ${position.title} - ${position.jobId}`}
                              className="flex-1"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Apply via Email
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* How to Apply Section */}
      <div className="border-t py-12" style={{ backgroundColor: palette.header, borderColor: palette.secondary + "33" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-light mb-6" style={{ color: palette.primary }}>{mergedCareers.howToApplyTitle || "How to Apply"}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 rounded-lg" style={{ backgroundColor: palette.background }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: palette.secondary }}>
                  <Send className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-medium mb-2" style={{ color: palette.primary }}>{mergedCareers.applyOnlineTitle || "Apply Online"}</h3>
                <p className="text-sm" style={{ color: palette.text }}>
                  {applyOnlineDesc}
                </p>
              </div>
              <div className="p-6 rounded-lg" style={{ backgroundColor: palette.background }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: palette.secondary }}>
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-medium mb-2" style={{ color: palette.primary }}>{mergedCareers.applyEmailTitle || "Apply via Email"}</h3>
                <p className="text-sm" style={{ color: palette.text }}>
                  {applyEmailDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-white py-8" style={{ backgroundColor: palette.primary }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium tracking-wide">{mergedCareers.footerBrandText || "WE MADE CAREERS"}</span>
            </div>
            <p className="text-sm" style={{ color: "#ffffff" + "b3" }}>
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CareersContent />
    </Suspense>
  );
}
