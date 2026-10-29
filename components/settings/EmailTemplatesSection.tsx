"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2, Save, Mail, Eye, EyeOff, FileText, AlertCircle, CheckCircle2,
  Copy, RotateCcw, Code2,
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

  const htmlEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlGutterRef = useRef<HTMLDivElement | null>(null);

  const htmlValue = currentTemplate.html || "";
  const htmlLineCount = htmlValue.split("\n").length;
  const htmlLines = Array.from({ length: htmlLineCount }, (_, index) => index + 1);

  const insertIntoHtml = (text: string) => {
    const editor = htmlEditorRef.current;
    const start = editor?.selectionStart ?? htmlValue.length;
    const end = editor?.selectionEnd ?? htmlValue.length;
    updateField("html", htmlValue.slice(0, start) + text + htmlValue.slice(end));

    requestAnimationFrame(() => {
      editor?.focus();
      const caret = start + text.length;
      editor?.setSelectionRange(caret, caret);
    });
  };

  const handleHtmlKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    insertIntoHtml("  ");
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlValue);
      addToast({ type: "success", title: "Copied", description: "HTML copied to clipboard" });
    } catch {
      addToast({ type: "error", title: "Copy failed", description: "Your browser blocked clipboard access" });
    }
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
    } catch {
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
            <Mail className="h-6 w-6 text-primary" />
            Email Templates
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
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
          <Button onClick={handleSave} disabled={isSaving} className="text-xs shadow-lg shadow-primary/10">
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
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100">{template.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug dark:text-slate-400">{template.description}</p>
                  </div>
                  {customized && (
                    <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
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
            <Card className="border-gray-100 shadow-sm dark:border-slate-800">
              <CardHeader className="bg-gray-50/50 pb-4 dark:bg-slate-800/70">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                  <FileText className="h-4 w-4" />
                  {currentMeta.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted border border-border p-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHtmlMode(false)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        !htmlMode ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Simple Editor
                    </button>
                    <button
                      onClick={() => setHtmlMode(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        htmlMode ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      HTML Code
                    </button>
                  </div>
                </div>

                {!htmlMode ? (<>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 dark:text-slate-400">
                    Subject Line
                  </label>
                  <Input
                    value={currentTemplate.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    placeholder="Enter email subject..."
                    className="h-11 border-gray-100 font-semibold dark:border-slate-800"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">
                    You can use placeholders like {"{name}"}, {"{companyName}"}, {"{position}"}.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 dark:text-slate-400">
                    Opening Paragraph
                  </label>
                  <textarea
                    value={currentTemplate.intro}
                    onChange={(e) => updateField("intro", e.target.value)}
                    placeholder="Enter the opening paragraph..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 dark:text-slate-400">
                    Main Body Text
                  </label>
                  <textarea
                    value={currentTemplate.body}
                    onChange={(e) => updateField("body", e.target.value)}
                    placeholder="Enter the main body text..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 dark:text-slate-400">
                    Closing / Instructions
                  </label>
                  <textarea
                    value={currentTemplate.closing}
                    onChange={(e) => updateField("closing", e.target.value)}
                    placeholder="Enter the closing text..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:border-slate-800"
                  />
                </div>
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-primary leading-relaxed">
                    Leave a field empty to keep the default text for that section. Changes apply the next time this
                    email is sent.
                  </p>
                </div>
                </>) : (
                  <div>
                    <div className="mb-2">
                      <label
                        htmlFor="email-html-body"
                        className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 dark:text-slate-400"
                      >
                        Custom HTML Body
                      </label>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-[#0b1220] shadow-sm [color-scheme:dark] focus-within:ring-2 focus-within:ring-primary/30">
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <Code2 className="h-3 w-3" />
                            HTML
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {htmlLineCount} {htmlLineCount === 1 ? "line" : "lines"} · {htmlValue.length} chars
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={copyHtml}
                            disabled={!htmlValue}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                          {currentTemplate.html && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Clear the custom HTML body? This cannot be undone.")) {
                                  updateField("html", "");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-red-300"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Placeholder chips */}
                      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-3 py-2">
                        <span className="text-[10px] font-medium text-slate-500">Insert</span>
                        {["name", "companyName", "position", "roundName", "loginUrl"].map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => insertIntoHtml(`{${token}}`)}
                            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            {`{${token}}`}
                          </button>
                        ))}
                      </div>

                      {/* Editor */}
                      <div className="flex max-h-[460px] min-h-[380px]">
                        <div
                          ref={htmlGutterRef}
                          aria-hidden
                          className="shrink-0 select-none overflow-hidden border-r border-white/5 px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-slate-600"
                        >
                          {htmlLines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                        <textarea
                          ref={htmlEditorRef}
                          id="email-html-body"
                          aria-label="Custom HTML email body"
                          value={htmlValue}
                          onChange={(e) => updateField("html", e.target.value)}
                          onKeyDown={handleHtmlKeyDown}
                          onScroll={(e) => {
                            if (htmlGutterRef.current) {
                              htmlGutterRef.current.scrollTop = e.currentTarget.scrollTop;
                            }
                          }}
                          placeholder="<!-- Paste or write your email HTML here -->"
                          spellCheck={false}
                          autoCapitalize="off"
                          autoCorrect="off"
                          wrap="off"
                          className="w-full flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-[12px] leading-6 text-slate-200 caret-primary outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-muted/60 border border-border rounded-xl p-3 mt-3">
                      <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Replaces the standard template. The subject line above still applies.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showPreview && (
            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-slate-400">Live Preview</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-lg dark:bg-slate-900 dark:border-slate-700">
                  Subject: {preview.subject || "—"}
                </span>
              </div>
              <div
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm dark:bg-slate-900 dark:border-slate-700"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
