"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2, Save, Mail, Eye, EyeOff, FileText, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import {
  getContentConfig,
  saveContentConfig,
  ContentConfig,
} from "@/services/contentConfigService";
import {
  EMAIL_TEMPLATE_LIST,
  DEFAULT_EMAIL_TEMPLATES,
  renderEmailPreview,
  EmailTemplateMeta,
} from "@/lib/emailTemplatesMeta";
import { EmailTemplateOverride } from "@/models/CompanyContentConfig";

interface EmailTemplatesSectionProps {
  companyId: string;
  companyName: string;
}

const PREVIEW_VARS = {
  name: "Ananya Sharma",
  companyName: "NexusHR",
  position: "Software Engineer",
  roundName: "Technical Round",
  candidateName: "Ananya Sharma",
  careerEmail: "careers@company.com",
  loginUrl: "https://portal.company.com/candidate-login",
};

export function EmailTemplatesSection({ companyId, companyName }: EmailTemplatesSectionProps) {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<Partial<Record<string, EmailTemplateOverride>>>({});
  const [selectedKey, setSelectedKey] = useState<string>(EMAIL_TEMPLATE_LIST[0].key);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [htmlMode, setHtmlMode] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadConfig();
  }, [companyId]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await getContentConfig(companyId);
      setTemplates(data.emailTemplates || {});
    } catch (error) {
      console.error("Failed to load content config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentMeta: EmailTemplateMeta | undefined =
    EMAIL_TEMPLATE_LIST.find((t) => t.key === selectedKey);

  const currentTemplate: EmailTemplateOverride = {
    ...DEFAULT_EMAIL_TEMPLATES[currentMeta?.key as keyof typeof DEFAULT_EMAIL_TEMPLATES],
    ...(templates[selectedKey] || {}),
  };

  const updateField = (field: keyof EmailTemplateOverride, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedKey]: { ...currentTemplate, [field]: value },
    }));
  };

  const preview = renderEmailPreview(currentTemplate, {
    ...PREVIEW_VARS,
    companyName,
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const config: ContentConfig = {
        emailTemplates: templates,
        careers: {},
      };
      await saveContentConfig(companyId, config);
      addToast({ type: "success", title: "Saved", description: "Email templates updated successfully" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update email templates" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasCustomization = (key: string): boolean => {
    const t = templates[key];
    if (!t) return false;
    return !!(t.subject || t.intro || t.body || t.closing || t.html);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email Templates
          </h2>
          <p className="text-sm text-gray-500">
            Customize the subject line and key text of every email the company sends to candidates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs"
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="text-xs shadow-lg shadow-blue-500/10">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Templates
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-2.5">
          {EMAIL_TEMPLATE_LIST.map((template) => {
            const isActive = selectedKey === template.key;
            const customized = hasCustomization(template.key);
            return (
              <button
                key={template.key}
                onClick={() => setSelectedKey(template.key)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50/40 ring-4 ring-blue-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{template.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{template.description}</p>
                  </div>
                  {customized && (
                    <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Custom
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {template.event}
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor + Preview */}
        <div className="lg:col-span-2 space-y-4">
          {currentMeta && (
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                  <FileText className="h-4 w-4" />
                  {currentMeta.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHtmlMode(false)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        !htmlMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Simple Editor
                    </button>
                    <button
                      onClick={() => setHtmlMode(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        htmlMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      HTML Code
                    </button>
                  </div>
                </div>

                {!htmlMode ? (<>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    Subject Line
                  </label>
                  <Input
                    value={currentTemplate.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    placeholder="Enter email subject..."
                    className="h-11 border-gray-100 font-semibold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">
                    You can use placeholders like {"{name}"}, {"{companyName}"}, {"{position}"}.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    Opening Paragraph
                  </label>
                  <textarea
                    value={currentTemplate.intro}
                    onChange={(e) => updateField("intro", e.target.value)}
                    placeholder="Enter the opening paragraph..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    Main Body Text
                  </label>
                  <textarea
                    value={currentTemplate.body}
                    onChange={(e) => updateField("body", e.target.value)}
                    placeholder="Enter the main body text..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                    Closing / Instructions
                  </label>
                  <textarea
                    value={currentTemplate.closing}
                    onChange={(e) => updateField("closing", e.target.value)}
                    placeholder="Enter the closing text..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Leave a field empty to keep the default text for that section. Changes apply the next time this
                    email is sent.
                  </p>
                </div>
                </>) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                        Custom HTML Body
                      </label>
                      {currentTemplate.html && (
                        <button
                          onClick={() => updateField("html", "")}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>
                    <textarea
                      value={currentTemplate.html}
                      onChange={(e) => updateField("html", e.target.value)}
                      placeholder={`<!-- Write your custom HTML here. -->\n<!-- Use placeholders like {name}, {companyName}, {position}, {loginUrl} -->\n<div style="font-family: Arial, sans-serif;">\n  <h2>Hello {name},</h2>\n  <p>We are excited to share the position of {position}.</p>\n</div>`}
                      rows={18}
                      spellCheck={false}
                      className="w-full px-3 py-3 border rounded-xl text-xs font-mono border-gray-200 bg-slate-900 text-green-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all leading-relaxed"
                    />
                    <div className="flex items-start gap-2 bg-purple-50/60 border border-purple-100 rounded-xl p-3 mt-3">
                      <AlertCircle className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-purple-700 leading-relaxed">
                        When a custom HTML body is set, it completely replaces the standard template. The subject line
                        above still applies. Available placeholders: {"{name}"}, {"{companyName}"}, {"{position}"}, {"{roundName}"}, {"{loginUrl}"}.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showPreview && (
            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                  Subject: {preview.subject || "—"}
                </span>
              </div>
              <div
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
