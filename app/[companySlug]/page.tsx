"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSettings, Settings } from "@/services/settingsService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Building2, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from "lucide-react";

interface CompanyInfo {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  email: string;
}

export default function CompanyLoginPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    fetchCompanyInfo();
  }, [companySlug]);

  useEffect(() => {
    if (company?.id) {
      fetchSettings();
    }
  }, [company]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`/api/company/${companySlug}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || "Company not found");
        setCompany(null);
      } else {
        setCompany(data.company);
        setError(null);
        // Persist verified company code to cookies (ask ID only once)
        if (typeof document !== "undefined" && data.company?.code) {
          document.cookie = `nexushr_company_code=${encodeURIComponent(data.company.code)}; path=/; max-age=31536000; SameSite=Lax`;
          localStorage.setItem("nexushr_company_code", data.company.code);
        }
      }
    } catch (err) {
      setError("Failed to load company information");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await getSettings({ companyId: company!.id });
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    const result = await login(email, password);

    if (result.success) {
      // Ensure the account belongs to this company before granting access
      if (!result.user?.isCandidate && result.user?.companyId !== company?.id) {
        addToast({ type: "error", title: "Wrong Company", description: "This account does not belong to this company's portal." });
        setIsLoggingIn(false);
        return;
      }
      addToast({ type: "success", title: "Login Successful", description: `Welcome to ${company?.name || 'your company'}!` });
      if (result.user?.isCandidate) {
        router.push(result.user?.mustChangePassword ? '/candidate/change-password' : '/candidate/dashboard');
      } else {
        router.push(result.user?.mustChangePassword ? '/change-password' : '/dashboard');
      }
    } else {
      addToast({ type: "error", title: "Login Failed", description: result.error || "Invalid credentials" });
    }

    setIsLoggingIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Company Not Found</h2>
            <p className="text-gray-600 mb-6">
              The company &quot;{companySlug}&quot; does not exist or is not registered.
            </p>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get branding values from settings or defaults
  const logoUrl = settings?.logo || company.logo;
  const primaryColor = settings?.primaryColor || '#2563eb';
  const loginTitle = settings?.loginTitle || 'Welcome Back';
  const loginSubtitle = settings?.loginSubtitle || `Sign in to ${company.name}`;
  const bgImage = settings?.loginBackground;
  const bgColor = settings?.loginBackgroundColor || '#f9fafb';

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundColor: bgImage ? 'transparent' : bgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative ambient glows if no custom background image */}
      {!bgImage && (
        <>
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        </>
      )}

      <div className="relative w-full max-w-md">
        {/* Company Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#03081c] p-2.5 shadow-2xl shadow-[#03081c]/30 border border-[#03081c] transition-transform hover:scale-105 duration-300">
              <img 
                src={logoUrl} 
                alt={company.name} 
                className="h-full w-full object-contain scale-105"
              />
            </div>
          ) : (
            <div 
              className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="h-10 w-10" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{loginTitle}</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mt-1">{company.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{loginSubtitle}</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 border-slate-200/80 rounded-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Employee Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your credentials to access your workplace dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10 h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl text-white font-bold shadow-lg transition-all mt-2"
                style={{ backgroundColor: primaryColor }}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In to Workplace"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={() => {
                  if (typeof document !== "undefined") {
                    document.cookie = "nexushr_company_code=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
                    document.cookie = "nexushr_company_code=; path=/; domain=.localhost; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
                    localStorage.removeItem("nexushr_company_code");
                  }
                  if (typeof window !== "undefined") {
                    const port = window.location.port ? `:${window.location.port}` : '';
                    const host = window.location.hostname.toLowerCase();
                    if (host.endsWith('.localhost') || host === 'localhost' || host === '127.0.0.1') {
                      window.location.href = `${window.location.protocol}//localhost${port}/login?switch=true`;
                      return;
                    }
                    const parts = host.split('.');
                    if (parts.length >= 2) {
                      const root = parts.slice(-2).join('.');
                      window.location.href = `${window.location.protocol}//${root}${port}/login?switch=true`;
                      return;
                    }
                  }
                  router.push("/login?switch=true");
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:underline transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Switch Organization (Enter Different ID)
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
          Powered by <span className="font-semibold text-slate-600">NexusHR Enterprise</span>
        </p>
      </div>
    </div>
  );
}
