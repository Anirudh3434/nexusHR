"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { ArrowLeft, ArrowRight, Check, ClipboardList, FolderOpen } from "lucide-react";
import { DEFAULT_CHECKLIST_TEMPLATE, DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/onboardingTemplates";

interface Department {
  _id: string;
  name: string;
}

export default function NewOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const isStaff = user?.role === "admin" || user?.role === "hr" || (user?.role as string) === "super_admin";

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [includeTemplates, setIncludeTemplates] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    position: "",
    department: "",
    reportingManager: "",
    employmentType: "Full-time",
    joiningDate: "",
    workLocation: "",
    ctc: "",
    probationMonths: "3",
    source: "manual",
  });

  useEffect(() => {
    if (!isStaff) {
      router.push("/onboarding");
    }
  }, [isStaff, router]);

  useEffect(() => {
    if (user?.companyId) {
      fetch(`/api/departments?companyId=${user.companyId}`)
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => setDepartments([]));
    }
  }, [user?.companyId]);

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateStep1 = () => {
    if (!form.fullName.trim()) return "Full name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return "A valid email is required";
    if (!form.joiningDate) return "Joining date is required";
    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      const error = validateStep1();
      if (error) {
        addToast({ type: "error", title: "Missing fields", description: error });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const handleSubmit = async () => {
    if (!form.password || form.password.length < 6) {
      addToast({ type: "error", title: "Password required", description: "Set an initial password (min 6 characters) for the employee account." });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ctc: form.ctc || undefined,
          probationMonths: Number(form.probationMonths) || 3,
          includeTemplates,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        addToast({ type: "error", title: "Error", description: data.message || "Failed to create onboarding" });
        return;
      }
      addToast({ type: "success", title: "Success", description: `Onboarding created for ${form.fullName}` });
      router.push(`/onboarding/${data.onboarding._id}`);
    } catch {
      addToast({ type: "error", title: "Error", description: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Start Employee Onboarding</h1>
        <p className="text-sm text-gray-500">Create the onboarding record. A login account is created for the new hire to complete documents and accept the offer.</p>
      </div>

      <Stepper
        steps={[
          { title: "Candidate Info", description: "Personal & job details" },
          { title: "Templates & Review", description: "Checklist + documents" },
        ]}
        currentStep={step - 1}
      />

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate Information</CardTitle>
            <CardDescription>Details used to generate the offer letter and employee record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input className={inputClass} placeholder="e.g. Ananya Sharma" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <Input className={inputClass} type="email" placeholder="ananya@company.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Initial Password *</label>
                <Input className={inputClass} type="text" placeholder="Min 6 characters" value={form.password} onChange={(e) => setField("password", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input className={inputClass} placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Position / Designation</label>
                <Input className={inputClass} placeholder="e.g. Senior Software Engineer" value={form.position} onChange={(e) => setField("position", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <select
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Employment Type</label>
                <select
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.employmentType}
                  onChange={(e) => setField("employmentType", e.target.value)}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Joining Date *</label>
                <Input className={inputClass} type="date" value={form.joiningDate} onChange={(e) => setField("joiningDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Reporting Manager</label>
                <Input className={inputClass} placeholder="e.g. Rahul Verma" value={form.reportingManager} onChange={(e) => setField("reportingManager", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Work Location</label>
                <Input className={inputClass} placeholder="e.g. Bengaluru / Remote" value={form.workLocation} onChange={(e) => setField("workLocation", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Annual CTC</label>
                <Input className={inputClass} placeholder="e.g. ₹12,00,000" value={form.ctc} onChange={(e) => setField("ctc", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Probation (months)</label>
                <Input className={inputClass} type="number" min={0} value={form.probationMonths} onChange={(e) => setField("probationMonths", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Candidate</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{form.fullName}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{form.email}</p></div>
              <div><p className="text-xs text-gray-500">Position</p><p className="font-medium">{form.position || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Department</p><p className="font-medium">{form.department || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Joining Date</p><p className="font-medium">{form.joiningDate ? new Date(form.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p></div>
              <div><p className="text-xs text-gray-500">CTC</p><p className="font-medium">{form.ctc || '—'}</p></div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen size={16} /> Onboarding Templates
              </CardTitle>
              <CardDescription>Pre-load a default checklist and required documents for this new hire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  checked={includeTemplates}
                  onChange={(e) => setIncludeTemplates(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Use default templates</p>
                  <p className="text-xs text-gray-500">
                    {DEFAULT_CHECKLIST_TEMPLATE.length} checklist tasks ({['HR', 'IT', 'Admin', 'Manager', 'Employee'].map((c) => `${c}: ${DEFAULT_CHECKLIST_TEMPLATE.filter((t) => t.category === c).length}`).join(' · ')}) and {DEFAULT_DOCUMENT_TEMPLATE.length} required documents.
                  </p>
                </div>
              </label>

              {includeTemplates && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><ClipboardList size={14} /> Checklist Tasks</p>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 p-2">
                      {DEFAULT_CHECKLIST_TEMPLATE.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          <div>
                            <p className="text-gray-800">{t.title}</p>
                            <p className="text-xs text-gray-400">{t.category} · {t.assigneeRole}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><FolderOpen size={14} /> Required Documents</p>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 p-2">
                      {DEFAULT_DOCUMENT_TEMPLATE.map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          <p className="text-gray-800">{d.title}{d.isRequired === false ? ' (optional)' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1 || submitting}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        {step === 1 ? (
          <Button onClick={handleNext}>
            Continue <ArrowRight size={16} className="ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Onboarding'}
          </Button>
        )}
      </div>
    </div>
  );
}
