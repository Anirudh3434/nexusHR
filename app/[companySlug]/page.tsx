"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSettings, Settings } from "@/services/settingsService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  Sun, 
  Moon,
  Sparkles 
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { SmartLogoBadge } from "@/components/ui/SmartLogoBadge";
import {
  generatePaletteFromColor,
  getBrandColorsFromSettings,
  extractTwoMajorLogoColors,
} from "@/lib/imageUtils";

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
  const { user, loading: authLoading, login, logout } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme, mounted } = useTheme();

  // If user is already authenticated and not switching companies, bounce straight to dashboard
  useEffect(() => {
    if (!authLoading && user && typeof window !== "undefined" && !window.location.search.includes("switch")) {
      const destination = 
        (user.role as string) === "super_admin" 
          ? "/super-admin" 
          : user.isCandidate 
            ? "/candidate/dashboard" 
            : "/dashboard";
      router.replace(destination);
    }
  }, [user, authLoading, router]);
  
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [logoFallback, setLogoFallback] = useState<{
    primary: string;
    secondary: string;
    logo: string;
  } | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, [companySlug]);

  useEffect(() => {
    if (company?.id) {
      fetchSettings();
    }
  }, [company]);

  // Compatibility for records saved before `themeSource` existed: those
  // records can still be logo-driven even though their stored primary color
  // is the old default blue. New/custom themes never hit this path.
  useEffect(() => {
    const logo = settings?.logo || company?.logo;
    const primary = settings?.primaryColor?.toLowerCase();
    const needsLogoFallback =
      settings?.themeSource === 'logo' &&
      !settings?.secondaryColor &&
      (!primary || primary === '#2563eb');

    if (!needsLogoFallback || !logo) return;

    let isCancelled = false;
    extractTwoMajorLogoColors(logo).then((colors) => {
      if (isCancelled || !colors) return;
      setLogoFallback({ ...colors, logo });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    settings?.themeSource,
    settings?.primaryColor,
    settings?.secondaryColor,
    settings?.logo,
    company?.logo,
  ]);

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
    } catch {
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

    const result = await login(email, password, { companyId: company?.id });

    if (result.success) {
      // Ensure the account belongs to this company before granting access
      if (!result.user?.isCandidate && result.user?.companyId !== company?.id) {
        logout();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-slate-800/50">
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dark:bg-slate-800/50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-red-500/15">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 dark:text-slate-100">Company Not Found</h2>
            <p className="text-gray-600 mb-6 dark:text-slate-400">
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

  // Get branding values from settings or defaults.
  // Saved settings are authoritative here too: the logo is only a fallback
  // color source in CompanyThemeSync, never a replacement for a chosen theme.
  const logoUrl = settings?.logo || company.logo;
  const legacyNeedsLogoFallback =
    settings?.themeSource === 'logo' &&
    !settings?.secondaryColor &&
    (!settings?.primaryColor || settings.primaryColor.toLowerCase() === '#2563eb');
  const resolvedBrand =
    legacyNeedsLogoFallback && logoFallback && logoFallback.logo === logoUrl
      ? logoFallback
      : getBrandColorsFromSettings(settings);
  const { primary: primaryColor, secondary: secondaryColor } = resolvedBrand;
  const palette = generatePaletteFromColor(primaryColor, secondaryColor);
  const loginTitle = settings?.loginTitle || 'Welcome Back';
  const loginSubtitle = settings?.loginSubtitle || `Sign in to ${company.name}`;
  const bgImage = settings?.loginBackground;
  const rawBgColor = settings?.loginBackgroundColor;
  const isDefaultBg = !rawBgColor || 
    rawBgColor.toLowerCase() === '#ffffff' || 
    rawBgColor.toLowerCase() === '#f9fafb' ||
    rawBgColor.toLowerCase() === '#fff';

  // Scope brand tokens to this page
  const brandStyle = {
    "--primary": palette.primary,
    "--primary-foreground": palette.textOnPrimary,
    "--secondary": palette.secondary,
    "--secondary-foreground": palette.textOnSecondary,
    "--accent": palette.primaryLight,
    "--accent-foreground": palette.primary,
    "--ring": palette.primary,
    "--brand-primary": palette.primary,
    "--brand-secondary": palette.secondary,
    "--brand-primary-glow": palette.primaryGlow,
  } as React.CSSProperties;

  const heroBackgroundStyle: React.CSSProperties = {
    backgroundImage: bgImage 
      ? `linear-gradient(135deg, ${palette.primary}e6, ${palette.secondary}f2), url(${bgImage})` 
      : `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: !isDefaultBg ? rawBgColor : palette.primary,
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col md:flex-row overflow-x-hidden bg-white dark:bg-[#0b1220] transition-colors duration-300"
      style={brandStyle}
    >
      {/* LEFT COLUMN: Brand Showcase & Hero Canvas */}
      <div 
        className="relative w-full md:w-[52%] lg:w-[55%] xl:w-[58%] min-h-[380px] md:min-h-screen p-8 sm:p-12 md:py-12 md:pl-12 md:pr-24 lg:py-16 lg:pl-16 lg:pr-32 xl:pr-36 flex flex-col justify-between overflow-hidden text-white shrink-0"
        style={heroBackgroundStyle}
      >
        {/* Subtle decorative glows for extra depth */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-black/15 blur-2xl pointer-events-none" />

        {/* Top Header: Logo & Company Name */}
        <div className="relative z-20 flex items-center gap-3.5">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white p-2.5 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
            <SmartLogoBadge
              src={logoUrl}
              alt={company.name}
              className="h-full w-full object-contain"
              fallbackBg={primaryColor}
            />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
              {company.name}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/15 backdrop-blur-md text-white/90 border border-white/20 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Workspace
            </div>
          </div>
        </div>

        {/* Middle Hero: Title, Subtitle */}
        <div className="relative z-20 my-8 md:my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Portal
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
            {loginTitle}
          </h1>
          <p className="text-sm sm:text-base text-white/85 font-medium leading-relaxed mt-3">
            {loginSubtitle}
          </p>
        </div>

        {/* Desktop Organic S-Curve Wave Divider on the RIGHT edge of left hero (curves into right form) */}
        <svg
          className="absolute top-0 -right-px bottom-0 h-full w-16 lg:w-24 xl:w-28 pointer-events-none z-10 hidden md:block text-white dark:text-[#0b1220] transition-colors duration-300"
          viewBox="0 0 100 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M100,0 C35,180 20,380 55,650 C85,820 60,930 100,1000 Z" />
        </svg>

        {/* Mobile Bottom Wave Divider */}
        <svg
          className="absolute -bottom-px left-0 right-0 w-full h-10 sm:h-14 pointer-events-none z-20 md:hidden text-white dark:text-[#0b1220] transition-colors duration-300"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,100 L0,30 C250,90 400,5 650,65 C850,110 950,30 1000,100 Z" />
        </svg>
      </div>

      {/* RIGHT COLUMN: Authentication Form (Email & Password on Right) */}
      <div className="relative w-full md:w-[48%] lg:w-[45%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-white dark:bg-[#0b1220] transition-colors duration-300 grow">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button 
            type="button"
            onClick={() => {
              logout();
              if (typeof document !== "undefined") {
                document.cookie = "nexushr_company_code=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
                localStorage.removeItem("nexushr_company_code");
              }
              router.push("/login?switch=true");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Switch Organization</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-all cursor-pointer"
            title={!mounted ? "Toggle theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            aria-label="Toggle theme"
          >
            {!mounted ? (
              <span className="block h-4 w-4" aria-hidden />
            ) : (
              <span className="relative w-4 h-4 flex items-center justify-center">
                <Sun
                  className={`w-4 h-4 transition-all duration-300 absolute ${
                    theme === "dark" ? "rotate-0 scale-100 opacity-100 text-amber-400" : "-rotate-90 scale-0 opacity-0"
                  }`}
                />
                <Moon
                  className={`w-4 h-4 transition-all duration-300 absolute ${
                    theme === "light" ? "rotate-0 scale-100 opacity-100 text-slate-600 dark:text-slate-300" : "rotate-90 scale-0 opacity-0"
                  }`}
                />
              </span>
            )}
          </button>
        </div>

        {/* Center Sign In Box */}
        <div className="w-full max-w-sm mx-auto my-auto py-4">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Employee Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Enter your credentials to access your workplace dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative group/input">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="pl-10 h-11 text-sm font-medium rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-11 text-sm font-medium rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200 hover:opacity-95 hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer mt-3"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                boxShadow: `0 8px 24px -6px ${palette.primaryGlow || 'rgba(0,0,0,0.3)'}`,
              }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workplace</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Notice */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-900 text-center text-xs text-slate-400 dark:text-slate-500">
          Secure Enterprise Authentication • 256-Bit SSL Encrypted
        </div>
      </div>
    </div>
  );
}
