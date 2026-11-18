"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SmartLogoBadge } from "@/components/ui/SmartLogoBadge";
import { generatePaletteFromColor, getBrandColorsFromSettings } from "@/lib/imageUtils";
import { Settings } from "@/services/settingsService";
import { 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Search, 
  Sparkles, 
  X,
  Sun,
  Moon,
  Lock,
  Mail,
  Eye,
  EyeOff
} from "lucide-react";

type LookupState = "idle" | "connecting" | "failed";

interface CompanyInfo {
  id: string;
  name: string;
  code: string;
  slug?: string;
  logo: string | null;
  email?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface RecentCompany {
  code: string;
  name: string;
  logo?: string | null;
  slug?: string;
}

export default function CompanyPortalLogin() {
  // Stage: "code" (Find Workplace) | "auth" (Email/Password Login)
  const [stage, setStage] = useState<"code" | "auth">("code");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Stage 1 (Company Code) State
  const [companyCode, setCompanyCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);

  // Stage 2 (Workplace Auth) State
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(null);
  const [selectedSettings, setSelectedSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Recents State (lazy initialized from localStorage)
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedRecents = localStorage.getItem("nexushr_recent_companies");
        if (storedRecents) {
          return JSON.parse(storedRecents);
        }
      } catch {}
    }
    return [];
  });

  const { addToast } = useToast();
  const { user, loading: authLoading, login, logout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const router = useRouter();

  // 0. If user is already authenticated, forward to dashboard
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

  // 1. Check saved company code on initial mount
  useEffect(() => {
    const checkSavedCompanyCode = async () => {
      // If user came via "Switch Organization", clear saved company state quietly without reload
      if (typeof window !== "undefined" && window.location.search.includes('switch')) {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("nexushr_company_code");
        document.cookie = "nexushr_company_code=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "nexushr_company_code=; path=/; domain=.localhost; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "nexushr_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        setIsCheckingSaved(false);
        return;
      }

      let savedCode: string | null = null;
      if (typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)nexushr_company_code=([^;]+)/);
        if (match) {
          savedCode = decodeURIComponent(match[1]);
        }
        if (!savedCode) {
          savedCode = localStorage.getItem("nexushr_company_code");
        }
      }

      if (savedCode) {
        try {
          const res = await fetch(`/api/company/${encodeURIComponent(savedCode)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.company) {
              const comp = data.company;
              let compSettings: Settings | null = null;
              try {
                const sRes = await fetch(`/api/company/settings?companyId=${comp.id}`);
                if (sRes.ok) compSettings = await sRes.json();
              } catch {}

              setSelectedCompany(comp);
              setSelectedSettings(compSettings);
              setStage("auth");
              setIsCheckingSaved(false);
              return;
            }
          }
        } catch {
          // Fall through to lookup stage
        }
      }

      setIsCheckingSaved(false);
    };

    checkSavedCompanyCode();
  }, []);

  // 2. Perform Company Lookup & Trigger Seamless Stage 2 Transition
  const executeLookup = async (code: string) => {
    if (!code || !code.trim()) return;
    setError(null);
    setLookupState("connecting");

    try {
      const response = await fetch(`/api/company/${encodeURIComponent(code.trim())}`);
      const data = await response.json();

      if (!response.ok || !data.exists) {
        setLookupState("failed");
        setError(data.message || `No organization found with ID "${code}".`);
        return;
      }

      const comp: CompanyInfo = data.company;
      const companySlug = comp.slug || comp.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || comp.code;

      // Fetch company custom settings
      let compSettings: Settings | null = null;
      try {
        const sRes = await fetch(`/api/company/settings?companyId=${comp.id}`);
        if (sRes.ok) {
          compSettings = await sRes.json();
        }
      } catch {}

      // Save to recent companies list
      if (typeof window !== "undefined") {
        try {
          const newRecent: RecentCompany = {
            code: comp.code,
            name: comp.name,
            logo: comp.logo,
            slug: companySlug,
          };
          setRecentCompanies(prev => {
            const filtered = prev.filter(c => c.code.toUpperCase() !== comp.code.toUpperCase());
            const updated = [newRecent, ...filtered].slice(0, 4);
            localStorage.setItem("nexushr_recent_companies", JSON.stringify(updated));
            return updated;
          });

          document.cookie = `nexushr_company_code=${encodeURIComponent(comp.code)}; path=/; max-age=31536000; SameSite=Lax`;
          localStorage.setItem("nexushr_company_code", comp.code);
        } catch {}
      }

      // Smooth cinematic transition into Stage 2 (Workplace Auth)
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCompany(comp);
        setSelectedSettings(compSettings);
        setStage("auth");
        setLookupState("idle");
        setIsTransitioning(false);
        if (typeof window !== "undefined") {
          window.history.pushState(null, '', `/${companySlug}`);
        }
      }, 350);

    } catch {
      setLookupState("failed");
      setError("Connection timed out or network error. Please try again.");
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLookup(companyCode);
  };

  // Switch Organization (Smoothly animate back to Stage 1)
  const handleSwitchOrganization = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStage("code");
      setSelectedCompany(null);
      setSelectedSettings(null);
      setEmail("");
      setPassword("");
      setError(null);
      setIsTransitioning(false);
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("nexushr_company_code");
      if (typeof document !== "undefined") {
        document.cookie = "nexushr_company_code=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "nexushr_company_code=; path=/; domain=.localhost; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      }
      if (typeof window !== "undefined") {
        window.history.pushState(null, '', '/login?switch=true');
      }
    }, 350);
  };

  // Perform Employee Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany?.id) return;
    setIsLoggingIn(true);

    const result = await login(email, password, { companyId: selectedCompany.id });

    if (result.success) {
      if (!result.user?.isCandidate && result.user?.companyId !== selectedCompany.id) {
        logout();
        addToast({ type: "error", title: "Wrong Company", description: "This account does not belong to this company's portal." });
        setIsLoggingIn(false);
        return;
      }
      addToast({ type: "success", title: "Login Successful", description: `Welcome to ${selectedCompany.name}!` });
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

  const handleRemoveRecent = (e: React.MouseEvent, codeToRemove: string) => {
    e.stopPropagation();
    setRecentCompanies(prev => {
      const updated = prev.filter(c => c.code !== codeToRemove);
      if (typeof window !== "undefined") {
        localStorage.setItem("nexushr_recent_companies", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Company Brand Styles (when in Stage 2)
  const { primary: compPrimary, secondary: compSecondary } = getBrandColorsFromSettings(selectedSettings || {});
  const companyPalette = generatePaletteFromColor(
    selectedCompany?.primaryColor || compPrimary,
    selectedCompany?.secondaryColor || compSecondary
  );

  const companyBgImage = selectedSettings?.loginBackground;
  const companyBgColor = selectedSettings?.loginBackgroundColor;
  const isDefaultCompBg = !companyBgColor || companyBgColor.toLowerCase() === '#ffffff' || companyBgColor.toLowerCase() === '#f9fafb' || companyBgColor.toLowerCase() === '#fff';

  const companyHeroStyle: React.CSSProperties = {
    backgroundImage: companyBgImage 
      ? `linear-gradient(135deg, ${companyPalette.primary}e6, ${companyPalette.secondary}f2), url(${companyBgImage})` 
      : `linear-gradient(135deg, ${companyPalette.primary}, ${companyPalette.secondary})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: !isDefaultCompBg ? companyBgColor : companyPalette.primary,
  };

  const companyBrandTokens = {
    "--primary": companyPalette.primary,
    "--primary-foreground": companyPalette.textOnPrimary,
    "--secondary": companyPalette.secondary,
    "--secondary-foreground": companyPalette.textOnSecondary,
    "--accent": companyPalette.primaryLight,
    "--accent-foreground": companyPalette.primary,
    "--ring": companyPalette.primary,
    "--brand-primary": companyPalette.primary,
    "--brand-secondary": companyPalette.secondary,
    "--brand-primary-glow": companyPalette.primaryGlow,
  } as React.CSSProperties;

  if (isCheckingSaved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-4 transition-colors duration-300">
        <div className="h-16 w-16 rounded-2xl bg-[#03081c] p-2.5 shadow-2xl ring-4 ring-indigo-500/20 border border-slate-800 mb-4 flex items-center justify-center animate-pulse overflow-hidden">
          <img src="/logo.png" alt="NexusHR" className="h-full w-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Verifying Workspace Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen w-full flex flex-col md:flex-row overflow-x-hidden bg-white dark:bg-[#0b1220] transition-colors duration-500 ${
        isTransitioning ? 'opacity-30 scale-[0.99] transition-all duration-350 ease-out' : 'opacity-100 scale-100 transition-all duration-350 ease-in'
      }`}
      style={stage === "auth" ? companyBrandTokens : undefined}
    >
      {/* ========================================================================= */}
      {/* STAGE 1: COMPANY CODE LOOKUP (Form on LEFT, NexusHR Brand Hero on RIGHT)  */}
      {/* ========================================================================= */}
      {stage === "code" && (
        <>
          {/* LEFT COLUMN: Company Lookup Form */}
          <div className="relative w-full md:w-[48%] lg:w-[45%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-white dark:bg-[#0b1220] transition-colors duration-300 grow order-2 md:order-1 animate-in fade-in slide-in-from-left-6 duration-500">
            {/* Top Action Bar */}
            <div className="flex items-center justify-end mb-6">
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

            {/* Center Container: Search Form & Recents */}
            <div className="w-full max-w-sm mx-auto my-auto py-4">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Enter Company ID
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Enter your organization&apos;s unique ID to access your dedicated workplace portal
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-3.5">
                <div className="relative group/input">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                  <Input
                    value={companyCode}
                    onChange={(e) => {
                      setCompanyCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="e.g. NX8K2P"
                    maxLength={12}
                    className="pl-10 h-11 uppercase font-mono tracking-widest font-black text-sm rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-inner"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-700 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={lookupState === "connecting"}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-teal-600 hover:from-indigo-700 hover:via-indigo-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {lookupState === "connecting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Recent Workplaces */}
              {recentCompanies.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-900 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Recent Workplaces
                  </p>
                  <div className="space-y-1.5">
                    {recentCompanies.map((recent) => (
                      <div
                        key={recent.code}
                        onClick={() => executeLookup(recent.code)}
                        className="group/recent w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/80 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-indigo-950/30 dark:hover:border-indigo-800/50 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-white p-1 border border-slate-200/80 dark:border-slate-700 text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm overflow-hidden">
                            {recent.logo ? (
                              <img src={recent.logo} alt={recent.name} className="h-full w-full object-contain" />
                            ) : (
                              <span className="text-[10px] font-black text-indigo-600">{recent.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover/recent:text-indigo-600 dark:group-hover/recent:text-indigo-400 truncate">
                              {recent.name}
                            </p>
                            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {recent.code}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover/recent:translate-x-0.5 transition-transform flex items-center gap-1">
                            Open <ArrowRight className="h-3 w-3" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(e, recent.code)}
                            title="Remove from history"
                            className="h-5 w-5 rounded-full hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center transition-colors ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimal Footer Links */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs font-semibold">
                <Link href="/candidate-login" className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                  <ArrowLeft className="h-3 w-3" /> Candidate Portal
                </Link>
                <Link href="/landing" className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                  Overview
                </Link>
                <Link href="/register" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                  Register Company <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-900 text-center text-xs text-slate-400 dark:text-slate-500">
              Enterprise Workplace Gateway • 256-Bit SSL Encrypted
            </div>
          </div>

          {/* RIGHT COLUMN: NexusHR Brand Hero Canvas */}
          <div 
            className="relative w-full md:w-[52%] lg:w-[55%] xl:w-[58%] min-h-[360px] md:min-h-screen p-8 sm:p-12 md:py-12 md:pr-12 md:pl-24 lg:py-16 lg:pr-16 lg:pl-32 xl:pl-36 flex flex-col justify-between overflow-hidden text-white shrink-0 order-1 md:order-2 animate-in fade-in slide-in-from-right-6 duration-500"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f766e 100%)',
            }}
          >
            {/* Subtle decorative depth glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

            {/* Top Header: Logo & Platform Title */}
            <div className="relative z-20 flex items-center gap-3.5">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white p-2.5 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                <img src="/logo.png" alt="NexusHR" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
                  NexusHR
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/15 backdrop-blur-md text-white/90 border border-white/20 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gateway Online
                </div>
              </div>
            </div>

            {/* Middle Hero: Title, Subtitle */}
            <div className="relative z-20 my-8 md:my-auto max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20 mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Enterprise Gateway
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
                Unified Workplace Platform
              </h1>
              <p className="text-sm sm:text-base text-white/85 font-medium leading-relaxed mt-3">
                Streamlined HR, automated payroll, real-time biometric attendance, and unified team collaboration for modern enterprises.
              </p>
            </div>

            {/* Desktop Wave Divider on the LEFT edge of hero */}
            <svg
              className="absolute top-0 -left-px bottom-0 h-full w-16 lg:w-24 xl:w-28 pointer-events-none z-10 hidden md:block text-white dark:text-[#0b1220] transition-colors duration-300"
              viewBox="0 0 100 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path fill="currentColor" d="M0,0 C65,180 80,380 45,650 C15,820 40,930 0,1000 Z" />
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
        </>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: WORKPLACE AUTH (Brand Hero on LEFT, Email/Password on RIGHT)    */}
      {/* ========================================================================= */}
      {stage === "auth" && selectedCompany && (
        <>
          {/* LEFT COLUMN: Company Brand Showcase & Hero Canvas */}
          <div 
            className="relative w-full md:w-[52%] lg:w-[55%] xl:w-[58%] min-h-[380px] md:min-h-screen p-8 sm:p-12 md:py-12 md:pl-12 md:pr-24 lg:py-16 lg:pl-16 lg:pr-32 xl:pr-36 flex flex-col justify-between overflow-hidden text-white shrink-0 animate-in fade-in slide-in-from-left-6 duration-500"
            style={companyHeroStyle}
          >
            {/* Subtle decorative glows for extra depth */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-black/15 blur-2xl pointer-events-none" />

            {/* Top Header: Logo & Company Name */}
            <div className="relative z-20 flex items-center gap-3.5">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white p-2.5 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                <SmartLogoBadge
                  src={selectedCompany.logo}
                  alt={selectedCompany.name}
                  className="h-full w-full object-contain"
                  fallbackBg={companyPalette.primary}
                />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
                  {selectedCompany.name}
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
                {selectedSettings?.loginTitle || 'Welcome Back'}
              </h1>
              <p className="text-sm sm:text-base text-white/85 font-medium leading-relaxed mt-3">
                {selectedSettings?.loginSubtitle || `Sign in to access your ${selectedCompany.name} workplace dashboard`}
              </p>
            </div>

            {/* Desktop Organic S-Curve Wave Divider on the RIGHT edge of left hero */}
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

          {/* RIGHT COLUMN: Employee Sign In Form (Email & Password on RIGHT) */}
          <div className="relative w-full md:w-[48%] lg:w-[45%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-white dark:bg-[#0b1220] transition-colors duration-300 grow animate-in fade-in slide-in-from-right-6 duration-500">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button 
                type="button"
                onClick={handleSwitchOrganization}
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
                      autoFocus
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
                    background: `linear-gradient(135deg, ${companyPalette.primary}, ${companyPalette.secondary})`,
                    boxShadow: `0 8px 24px -6px ${companyPalette.primaryGlow || 'rgba(0,0,0,0.3)'}`,
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
              NexusHR Secure Enterprise Authentication • All Rights Reserved
            </div>
          </div>
        </>
      )}
    </div>
  );
}
