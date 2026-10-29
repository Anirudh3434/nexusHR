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
  ArrowUpRight,
  Info,
  ShieldCheck,
  CheckCircle2,
  Inbox,
  Server
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getEmailConfig,
  saveEmailConfig,
  syncEmails,
  EmailConfig,
  EmailConfigInput
} from "@/services/emailConfigService";
import { useToast } from "@/context/ToastContext";
import { useSearchParams } from "next/navigation";

interface EmailSectionProps {
  companyId: string;
}

function GoogleWorkspaceIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M6 14.5V37c0 2.2 1.8 4 4 4h4V22L6 14.5z" />
      <path fill="#34A853" d="M34 41h4c2.2 0 4-1.8 4-4V14.5L34 22v19z" />
      <path fill="#EA4335" d="M34 11l-10 7.5L14 11v11l10 7.5 10-7.5V11z" />
      <path fill="#FBBC05" d="M6 14.5L14 22V11l-5.6-4.2C7.2 5.9 6 6.8 6 8.2v6.3z" />
      <path fill="#C5221F" d="M34 11v11l8-7.5V8.2c0-1.4-1.2-2.3-2.4-1.4L34 11z" />
    </svg>
  );
}

function Microsoft365Icon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="18" height="18" rx="2" fill="#F25022" />
      <rect x="26" y="4" width="18" height="18" rx="2" fill="#7FBA00" />
      <rect x="4" y="26" width="18" height="18" rx="2" fill="#00A4EF" />
      <rect x="26" y="26" width="18" height="18" rx="2" fill="#FFB900" />
    </svg>
  );
}

const emailProviders = [
  {
    id: 'gmail',
    name: 'Google Workspace',
    icon: '/icons/google-workspace.svg',
    description: 'Gmail or Google Workspace',
  },
  {
    id: 'outlook',
    name: 'Microsoft 365',
    icon: '/icons/microsoft-365.svg',
    description: 'Outlook or Microsoft 365',
  },
  {
    id: 'other',
    name: 'Custom IMAP',
    icon: null,
    description: 'Other mail servers',
  },
];

const providerLabel = (id: string) =>
  id === 'gmail' ? 'Google Workspace' : id === 'outlook' ? 'Microsoft 365' : 'Custom IMAP';

const defaultJobKeywords = ['job', 'position', 'application', 'resume', 'cv', 'hiring', 'career', 'apply'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSection({ companyId }: EmailSectionProps) {
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [highlightEmail, setHighlightEmail] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPromptedRef = useRef(false);

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

  const isOAuthProvider = formData.provider === 'gmail' || formData.provider === 'outlook';
  const isConnected = !!config?.connected;
  const connectedEmail = config?.careerEmail || '';
  const connectedProvider = config?.provider || null;
  const connectedMatchesSelection = isConnected && connectedProvider === formData.provider;
  const emailLooksValid = emailPattern.test(formData.careerEmail.trim());

  // Scrolls to and pulses the inbox email field so users know exactly where to type.
  const promptForEmail = () => {
    const input = emailInputRef.current;
    if (!input) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    input.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

    // Only pull the keyboard up on larger screens; on mobile just highlight the field.
    if (window.matchMedia("(min-width: 640px)").matches) {
      window.setTimeout(() => input.focus({ preventScroll: true }), reduceMotion ? 0 : 320);
    }

    setHighlightEmail(false);
    window.requestAnimationFrame(() => setHighlightEmail(true));

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightEmail(false), 3400);
  };

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

  // First-time visitors with no inbox yet get guided straight to the email field.
  useEffect(() => {
    if (isLoading || autoPromptedRef.current) return;
    if (config?.connected) return;
    if (formData.careerEmail.trim()) return;

    autoPromptedRef.current = true;
    const timer = setTimeout(() => promptForEmail(), 450);
    return () => clearTimeout(timer);
  }, [isLoading, config, formData.careerEmail]);

  // Clean up the highlight timer if the section unmounts mid-animation.
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

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
    const email = formData.careerEmail.trim();

    if (!email) {
      promptForEmail();
      addToast({
        type: "error",
        title: "Inbox email required",
        description: isOAuthProvider
          ? `Connect your ${providerLabel(formData.provider)} inbox below, or type the email that receives applications.`
          : "Enter the email that receives applications.",
      });
      return;
    }

    if (!emailPattern.test(email)) {
      promptForEmail();
      addToast({
        type: "error",
        title: "Check the email address",
        description: "It should look like careers@yourcompany.com.",
      });
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveEmailConfig({ ...formData, careerEmail: email });
      setConfig(prev => ({ ...(prev ?? {}), ...saved, connected: prev?.connected ?? false } as EmailConfig));
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

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await syncEmails(companyId);
      const imported = typeof result.new === 'number' ? result.new : 0;
      addToast({
        type: "success",
        title: "Inbox synced",
        description: imported > 0
          ? `${imported} new application${imported === 1 ? '' : 's'} imported.`
          : "No new applications found.",
      });
      setConfig(prev => (prev ? { ...prev, lastSyncAt: new Date().toISOString() } : prev));
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Sync failed",
        description: error?.message || "Could not reach your inbox. Try reconnecting.",
      });
    } finally {
      setIsSyncing(false);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Integration
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Connect the inbox that receives applications. New emails become candidates.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-lg shadow-primary/10">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1 — Provider Selection */}
          <Card className="border-gray-100 shadow-sm overflow-hidden dark:border-slate-800">
            <CardHeader className="bg-gray-50/50 pb-4 dark:bg-slate-800/70">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Globe className="h-4 w-4" />
                <span>1 · Service Provider</span>
              </CardTitle>
              <CardDescription className="text-[11px] font-medium">
                Where your applications arrive.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {emailProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, provider: provider.id as any }))}
                    aria-pressed={formData.provider === provider.id}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.provider === provider.id
                        ? 'border-primary ring-4 ring-primary/10 bg-card'
                        : 'border-border hover:border-primary/30 bg-muted/40'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {provider.id === 'gmail' ? (
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          <GoogleWorkspaceIcon className="w-7 h-7" />
                        </div>
                      ) : provider.id === 'outlook' ? (
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          <Microsoft365Icon className="w-7 h-7" />
                        </div>
                      ) : provider.icon ? (
                        <img src={provider.icon} alt={provider.name} className="w-8 h-8 object-contain shrink-0" />
                      ) : (
                        <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center dark:bg-slate-700 shrink-0">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        </div>
                      )}
                      {formData.provider === provider.id && (
                        <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-gray-900 tracking-tight dark:text-slate-100">{provider.name}</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{provider.description}</p>
                  </button>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Gmail → Google Workspace · Outlook → Microsoft 365
              </p>
            </CardContent>
          </Card>

          {/* Step 2 — Account Connection */}
          <Card className="border-gray-100 shadow-sm overflow-hidden dark:border-slate-800">
            <CardHeader className="bg-gray-50/50 pb-4 dark:bg-slate-800/70">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Lock className="h-4 w-4" />
                <span>2 · Account Connection</span>
              </CardTitle>
              <CardDescription className="text-[11px] font-medium">
                Sign in to the inbox that receives applications.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 dark:text-slate-400">
                  Recruitment inbox email
                  {isOAuthProvider && (
                    <span className="ml-2 normal-case tracking-normal font-semibold text-muted-foreground">(optional)</span>
                  )}
                </label>
                <Input
                  ref={emailInputRef}
                  type="email"
                  placeholder="careers@yourcompany.com"
                  value={formData.careerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, careerEmail: e.target.value }))}
                  onFocus={() => setHighlightEmail(false)}
                  aria-invalid={formData.careerEmail.trim().length > 0 && !emailLooksValid}
                  aria-describedby="recruitment-email-help"
                  className={`h-11 border-gray-100 font-bold dark:border-slate-800 ${highlightEmail ? "field-attention" : ""}`}
                />
                {formData.careerEmail.trim().length > 0 && !emailLooksValid ? (
                  <p id="recruitment-email-help" className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Enter a valid email, e.g. careers@yourcompany.com
                  </p>
                ) : (
                  <p id="recruitment-email-help" className="mt-2 text-[11px] text-muted-foreground">
                    {isOAuthProvider
                      ? "Leave blank — connecting fills it in automatically."
                      : "Receives applications and sends replies."}
                  </p>
                )}
              </div>

              {isOAuthProvider && (
                connectedMatchesSelection ? (
                  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">Connected</p>
                          <p className="text-[11px] text-muted-foreground truncate">{connectedEmail}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectOAuth(formData.provider)}
                        className="rounded-xl text-xs font-bold shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Reconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground">
                          Connect {providerLabel(formData.provider)}
                        </h4>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Sign in and approve access. We never see your password.
                        </p>

                        {isConnected && !connectedMatchesSelection && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-card/80 border border-primary/10 px-2.5 py-2 text-[10px] font-medium text-muted-foreground">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                            Currently connected to {providerLabel(connectedProvider || '')} as {connectedEmail}. Connecting here replaces it.
                          </p>
                        )}

                        <Button
                          onClick={() => handleConnectOAuth(formData.provider)}
                          className="mt-3 h-9 px-4 rounded-xl font-bold text-xs shadow-md shadow-primary/15 active:scale-95 transition-all"
                        >
                          Connect account
                          <ArrowUpRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {formData.provider === 'other' && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <Server className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Find these under &ldquo;IMAP/SMTP&rdquo; in your provider&apos;s settings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Incoming (IMAP)</h5>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block dark:text-slate-400">Host</label>
                        <Input
                          placeholder="imap.yourprovider.com"
                          value={formData.imapHost}
                          onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                          className="h-9 border-gray-100 dark:border-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block dark:text-slate-400">Port</label>
                        <Input
                          type="number"
                          value={formData.imapPort}
                          onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                          className="h-9 border-gray-100 text-xs dark:border-slate-800"
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">Usually 993 (SSL)</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Outgoing (SMTP)</h5>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block dark:text-slate-400">Host</label>
                        <Input
                          placeholder="smtp.yourprovider.com"
                          value={formData.smtpHost}
                          onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                          className="h-9 border-gray-100 dark:border-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block dark:text-slate-400">Port</label>
                        <Input
                          type="number"
                          value={formData.smtpPort}
                          onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                          className="h-9 border-gray-100 text-xs dark:border-slate-800"
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">Usually 587 (TLS)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                Read and send access only. Passwords are never stored.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Auto-Replies */}
          <Card className="border-gray-100 shadow-sm dark:border-slate-800">
            <CardHeader className="bg-gray-50/50 pb-4 dark:bg-slate-800/70">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Sparkles className="h-4 w-4" />
                Auto-Replies
              </CardTitle>
              <CardDescription className="text-[11px] font-medium">
                Acknowledge applicants automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Enabled</span>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    aria-label="Enable auto-replies"
                    checked={formData.autoReplyEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoReplyEnabled: e.target.checked }))}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary dark:bg-slate-700"></div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Reply message
                </label>
                <textarea
                  value={formData.autoReplyTemplate}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoReplyTemplate: e.target.value }))}
                  disabled={!formData.autoReplyEnabled}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-40 dark:border-slate-800"
                  placeholder="Confirmation message..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Inbox Sync */}
          <Card className="border-gray-100 shadow-sm dark:border-slate-800">
            <CardHeader className="bg-gray-50/50 pb-4 dark:bg-slate-800/70">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <RefreshCw className="h-4 w-4" />
                Inbox Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {isConnected ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-foreground truncate">{connectedEmail}</p>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Last sync: <span className="font-bold normal-case tracking-normal text-foreground">
                      {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : 'never'}
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                    Sync now
                  </Button>
                </>
              ) : (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Inbox className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-[11px]">Connect above to import applications.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detection */}
          <div className="p-5 rounded-2xl border border-dashed border-gray-100 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-800/70">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" />
              What counts as an application
            </h5>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed dark:text-slate-400">
              Emails containing <span className="font-bold text-foreground">{formData.jobKeywords?.slice(0, 3).join(', ')}</span> are imported as applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
