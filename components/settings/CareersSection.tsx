"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2, Save, Eye, EyeOff, Globe, AlertCircle,
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
  DEFAULT_CAREERS,
  CAREER_COLOR_FIELDS,
  renderCareersPreview,
} from "@/lib/emailTemplatesMeta";
import { CareersOverride } from "@/models/CompanyContentConfig";

interface CareersSectionProps {
  companyId: string;
  companyName: string;
}

const PREVIEW_VARS = {
  companyName: "NexusHR",
  careerEmail: "careers@company.com",
};

const COLOR_LABELS: Record<string, string> = {
  primaryColor: "Primary",
  secondaryColor: "Secondary",
  accentColor: "Accent",
  backgroundColor: "Background",
  textColor: "Text",
  headerColor: "Header / Card",
  buttonColor: "Button",
};

const COLOR_PRESETS: { name: string; colors: Partial<CareersOverride> }[] = [
  {
    name: "Classic (Dark)",
    colors: {
      primaryColor: "#0f172a",
      secondaryColor: "#475569",
      accentColor: "#2563eb",
      backgroundColor: "#f8fafc",
      textColor: "#64748b",
      headerColor: "#ffffff",
      buttonColor: "#0f172a",
    },
  },
  {
    name: "Ocean Blue",
    colors: {
      primaryColor: "#1e3a8a",
      secondaryColor: "#3b82f6",
      accentColor: "#0ea5e9",
      backgroundColor: "#eff6ff",
      textColor: "#475569",
      headerColor: "#ffffff",
      buttonColor: "#1d4ed8",
    },
  },
  {
    name: "Forest Green",
    colors: {
      primaryColor: "#14532d",
      secondaryColor: "#16a34a",
      accentColor: "#22c55e",
      backgroundColor: "#f0fdf4",
      textColor: "#475569",
      headerColor: "#ffffff",
      buttonColor: "#15803d",
    },
  },
  {
    name: "Warm Sunset",
    colors: {
      primaryColor: "#7c2d12",
      secondaryColor: "#ea580c",
      accentColor: "#f59e0b",
      backgroundColor: "#fff7ed",
      textColor: "#57534e",
      headerColor: "#ffffff",
      buttonColor: "#c2410c",
    },
  },
  {
    name: "Midnight Purple",
    colors: {
      primaryColor: "#3b0764",
      secondaryColor: "#8b5cf6",
      accentColor: "#a855f7",
      backgroundColor: "#faf5ff",
      textColor: "#64748b",
      headerColor: "#ffffff",
      buttonColor: "#7c3aed",
    },
  },
];

const FIELD_LABELS: { key: keyof CareersOverride; label: string; placeholder: string }[] = [
  { key: "brandText", label: "Brand Badge", placeholder: "WE MADE CAREERS" },
  { key: "heroTitle", label: "Hero Title", placeholder: "Join Our Team" },
  { key: "heroSubtitle", label: "Hero Subtitle", placeholder: "We believe in nurturing talent..." },
  { key: "openPositionsTitle", label: "Open Positions Title", placeholder: "Open Positions" },
  { key: "openPositionsSubtitle", label: "Open Positions Subtitle", placeholder: "Browse our current job openings and apply today" },
  { key: "howToApplyTitle", label: "How to Apply Title", placeholder: "How to Apply" },
  { key: "applyOnlineTitle", label: "Apply Online Title", placeholder: "Apply Online" },
  { key: "applyOnlineDesc", label: "Apply Online Description", placeholder: "Click Apply Online on any job posting..." },
  { key: "applyEmailTitle", label: "Apply via Email Title", placeholder: "Apply via Email" },
  { key: "applyEmailDesc", label: "Apply via Email Description", placeholder: "Send your resume and cover letter to {careerEmail}..." },
  { key: "footerBrandText", label: "Footer Brand", placeholder: "WE MADE CAREERS" },
];

export function CareersSection({ companyId, companyName }: CareersSectionProps) {
  const { addToast } = useToast();
  const [careers, setCareers] = useState<Partial<CareersOverride>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    loadConfig();
  }, [companyId]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await getContentConfig(companyId);
      setCareers(data.careers || {});
    } catch (error) {
      console.error("Failed to load content config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const mergedCareers: CareersOverride = {
    ...DEFAULT_CAREERS,
    ...careers,
  };

  const updateField = (key: keyof CareersOverride, value: string) => {
    setCareers((prev) => ({ ...prev, [key]: value }));
  };

  const preview = renderCareersPreview(mergedCareers, { ...PREVIEW_VARS, companyName });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const config: ContentConfig = {
        emailTemplates: {},
        careers,
      };
      await saveContentConfig(companyId, config);
      addToast({ type: "success", title: "Saved", description: "Careers page updated successfully" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to update careers page" });
    } finally {
      setIsSaving(false);
    }
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
            <Globe className="h-6 w-6 text-blue-600" />
            Careers Page
          </h2>
          <p className="text-sm text-gray-500">
            Customize the public careers page shown to job seekers.
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
            Save Careers Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
              <Globe className="h-4 w-4" />
              Page Content
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {FIELD_LABELS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  {field.label}
                </label>
                <Input
                  value={mergedCareers[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-10 border-gray-100 font-medium"
                />
              </div>
            ))}

            {/* Color Palette */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
                Color Palette
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      const next = { ...careers };
                      (Object.keys(preset.colors) as (keyof CareersOverride)[]).forEach((k) => {
                        next[k] = preset.colors[k] || "";
                      });
                      setCareers(next);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] font-bold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CAREER_COLOR_FIELDS.map((field) => (
                  <div key={field} className="flex items-center gap-2 bg-slate-50 border border-gray-100 rounded-xl px-3 py-2">
                    <input
                      type="color"
                      value={mergedCareers[field] || DEFAULT_CAREERS[field] || "#000000"}
                      onChange={(e) => updateField(field, e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer bg-white"
                    />
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {COLOR_LABELS[field] || field}
                      </label>
                      <span className="text-[10px] font-mono text-gray-400">
                        {mergedCareers[field] || DEFAULT_CAREERS[field] || ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Use {"{careerEmail}"} in the email description to show the configured recruitment email. Leave a field
                empty to keep the default text.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <div className="rounded-2xl border border-gray-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div dangerouslySetInnerHTML={{ __html: preview }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
