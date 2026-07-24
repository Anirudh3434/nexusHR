"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Mail, 
  Check, 
  AlertCircle, 
  Save, 
  Sparkles, 
  Tag, 
  RefreshCw,
  Globe,
  Lock,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  getEmailConfig, 
  saveEmailConfig, 
  EmailConfig, 
  EmailConfigInput 
} from "@/services/emailConfigService";
import { useToast } from "@/context/ToastContext";
import { useSearchParams } from "next/navigation";

interface EmailSectionProps {
  companyId: string;
}

const emailProviders = [
  { 
    id: 'gmail', 
    name: 'Google Workspace', 
    icon: 'https://www.google.com/gmail/about/static/images/logo-gmail.png',
    description: 'Connect via Secure OAuth 2.0',
    color: 'bg-red-50/50 border-red-100 text-red-700',
  },
  { 
    id: 'outlook', 
    name: 'Microsoft 365', 
    icon: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    description: 'Connect via Microsoft OAuth',
    color: 'bg-blue-50/50 border-blue-100 text-blue-700',
  },
  { 
    id: 'other', 
    name: 'Custom IMAP', 
    icon: null,
    description: 'Generic IMAP/SMTP settings',
    color: 'bg-gray-50/50 border-gray-100 text-gray-700',
  },
];

const defaultJobKeywords = ['job', 'position', 'application', 'resume', 'cv', 'hiring', 'career', 'apply'];

export function EmailSection({ companyId }: EmailSectionProps) {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<EmailConfigInput>({
    companyId: companyId,
    provider: 'gmail',
    careerEmail: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    autoReplyEnabled: true,
    autoReplyTemplate: 'Thank you for your application. We have received your resume and will review it shortly.\n\nBest regards,\nRecruitment Team',
    jobKeywords: defaultJobKeywords,
  });

  const hasShownToast = useRef(false);

  useEffect(() => {
    if (companyId) {
      loadConfig();
    }
  }, [companyId]);

  useEffect(() => {
    if (hasShownToast.current) return;
    
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success || error) {
      hasShownToast.current = true;
      if (success) {
        addToast({ type: "success", title: "Connected", description: "Email account linked successfully" });
      } else {
        addToast({ type: "error", title: "Connection Failed", description: error?.replace(/_/g, ' ') || "Could not connect" });
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, addToast]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await getEmailConfig(companyId);
      if (data) {
        setConfig(data);
        setFormData({
          companyId: data.companyId,
          provider: data.provider,
          careerEmail: data.careerEmail,
          imapHost: data.imapHost || '',
          imapPort: data.imapPort || 993,
          imapSecure: data.imapSecure ?? true,
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpSecure: data.smtpSecure ?? true,
          autoReplyEnabled: data.autoReplyEnabled,
          autoReplyTemplate: data.autoReplyTemplate,
          jobKeywords: data.jobKeywords || defaultJobKeywords,
        });
      }
    } catch (error) {
      console.error("Failed to load email config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.careerEmail) {
      addToast({ type: "error", title: "Required Field", description: "Please enter a career email address" });
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveEmailConfig(formData);
      setConfig(saved);
      addToast({ type: "success", title: "Settings Saved", description: "Email configuration updated" });
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to save email settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectOAuth = (provider: string) => {
    const redirectUrl = provider === 'gmail' 
      ? `/api/auth/gmail?companyId=${companyId}`
      : `/api/auth/outlook?companyId=${companyId}`;
    window.location.href = redirectUrl;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email Integration
          </h2>
          <p className="text-sm text-gray-500">Sync your recruitment inbox and automate replies.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-lg shadow-blue-500/10">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Selection */}
          <Card className="border-gray-100 shadow-sm overflow-hidden">
             <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                  <Globe className="h-4 w-4" />
                  Service Provider
                </CardTitle>
              </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {emailProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setFormData(prev => ({ ...prev, provider: provider.id as any }))}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.provider === provider.id 
                        ? 'border-blue-500 ring-4 ring-blue-50 bg-white' 
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {provider.icon ? (
                        <img src={provider.icon} alt={provider.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      {formData.provider === provider.id && (
                        <div className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                           <Check className="w-3 h-3 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-gray-900 tracking-tight">{provider.name}</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{provider.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connection Area */}
          <Card className="border-gray-100 shadow-sm overflow-hidden">
             <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                  <Lock className="h-4 w-4" />
                  Account Connection
                </CardTitle>
              </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  Target Recruitment Email
                </label>
                <Input
                  type="email"
                  placeholder="careers@company.com"
                  value={formData.careerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, careerEmail: e.target.value }))}
                  className="h-11 border-gray-100 font-bold"
                />
              </div>

              {formData.provider !== 'other' && formData.careerEmail && (
                <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${formData.provider === 'gmail' ? 'bg-red-50/30 border-red-100' : 'bg-blue-50/30 border-blue-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${formData.provider === 'gmail' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                       <Mail className="h-6 w-6" />
                    </div>
                    <div>
                       <h4 className={`text-sm font-bold ${formData.provider === 'gmail' ? 'text-red-900' : 'text-blue-900'}`}>{formData.provider === 'gmail' ? 'Google' : 'Microsoft'} Authorization</h4>
                       <p className={`text-[10px] font-medium max-w-[240px] ${formData.provider === 'gmail' ? 'text-red-600/80' : 'text-blue-600/80'}`}>Securely connect via OAuth 2.0. We never store your password.</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleConnectOAuth(formData.provider)}
                    className={`${formData.provider === 'gmail' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} font-bold text-xs h-10 px-6 rounded-xl shadow-lg transition-all active:scale-95`}
                  >
                    Authenticate Now
                    <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              )}

              {formData.provider === 'other' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                   <div className="space-y-4">
                     <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Incoming (IMAP)</h5>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Host</label>
                       <Input value={formData.imapHost} onChange={(e) => setFormData({...formData, imapHost: e.target.value})} className="h-9 border-gray-100" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Port</label>
                       <Input type="number" value={formData.imapPort} onChange={(e) => setFormData({...formData, imapPort: parseInt(e.target.value)})} className="h-9 border-gray-100 text-xs" />
                     </div>
                   </div>
                   <div className="space-y-4">
                     <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Outgoing (SMTP)</h5>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Host</label>
                       <Input value={formData.smtpHost} onChange={(e) => setFormData({...formData, smtpHost: e.target.value})} className="h-9 border-gray-100" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Port</label>
                       <Input type="number" value={formData.smtpPort} onChange={(e) => setFormData({...formData, smtpPort: parseInt(e.target.value)})} className="h-9 border-gray-100 text-xs" />
                     </div>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Automation Switch */}
          <Card className="border-gray-100 shadow-sm">
             <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                  <Sparkles className="h-4 w-4" />
                  Auto-Replies
                </CardTitle>
              </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-xs font-bold text-gray-700">Enabled</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.autoReplyEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
              </div>
              <textarea
                value={formData.autoReplyTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, autoReplyTemplate: e.target.value }))}
                disabled={!formData.autoReplyEnabled}
                rows={4}
                className="w-full px-3 py-2 border rounded-xl text-xs font-medium border-gray-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-40"
                placeholder="Confirmation message..."
              />
            </CardContent>
          </Card>

          {/* Sync Status */}
          {config?.lastSyncAt && (
             <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/20">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-8 w-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-white" />
                   </div>
                   <h4 className="text-xs font-black uppercase tracking-widest">Active System</h4>
                </div>
                <p className="text-[10px] font-medium text-green-50 leading-relaxed mb-1">
                   Everything is synced. Last update:
                </p>
                <p className="text-xs font-bold text-white tracking-tight">
                   {new Date(config.lastSyncAt).toLocaleString()}
                </p>
             </div>
          )}

          <div className="p-6 rounded-2xl border border-dashed border-gray-100 bg-gray-50/50">
             <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Detection Bias
             </h5>
             <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                We automatically flag incoming emails as "Applications" if they contain keywords like: {formData.jobKeywords?.slice(0, 3).join(', ')}...
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
