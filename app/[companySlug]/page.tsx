"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSettings, Settings } from "@/services/settingsService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
      addToast({ type: "success", title: "Login Successful", description: `Welcome to ${company?.name || 'your company'}!` });
      router.push('/dashboard');
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: bgImage ? 'transparent' : bgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md">
        {/* Company Header */}
        <div className="text-center mb-6">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={company.name} 
              className="h-20 object-contain mx-auto mb-4"
            />
          ) : (
            <div 
              className="h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{loginTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{loginSubtitle}</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center" style={{ color: primaryColor }}>
              Employee Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full text-white"
                style={{ backgroundColor: primaryColor }}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link 
                href="/" 
                className="text-sm hover:underline"
                style={{ color: primaryColor }}
              >
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by NexusHR
        </p>
      </div>
    </div>
  );
}
