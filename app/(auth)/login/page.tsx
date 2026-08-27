"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  Building2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Check, 
  X, 
  ShieldCheck,
  Zap
} from "lucide-react";

type LookupState = "idle" | "connecting" | "success" | "failed";

interface RecentCompany {
  code: string;
  name: string;
  logo?: string | null;
  slug?: string;
}

export default function CompanyPortalLogin() {
  const [companyCode, setCompanyCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [targetCompany, setTargetCompany] = useState<{ name: string; code: string; logo?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();
  const router = useRouter();

  // 1. On Mount: Check cookie / localStorage for saved 6-character Company ID and recent list
  useEffect(() => {
    // Load recent companies list
    if (typeof window !== "undefined") {
      try {
        const storedRecents = localStorage.getItem("nexushr_recent_companies");
        if (storedRecents) {
          setRecentCompanies(JSON.parse(storedRecents));
        }
      } catch {}
    }

    const checkSavedCompanyCode = async () => {
      // If user came via "Switch Organization", clear all saved state immediately
      if (typeof window !== "undefined" && window.location.search.includes('switch')) {
        document.cookie = "nexushr_company_code=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie = "nexushr_company_code=; path=/; domain=.localhost; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        localStorage.removeItem("nexushr_company_code");
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
          const data = await res.json();
          if (res.ok && data.exists) {
            // Automatically redirect to remembered company portal using clean company name slug
            const targetSlug = data.company.slug || data.company.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || data.company.code;
            if (typeof window !== "undefined") {
              const host = window.location.hostname.toLowerCase();
              const protocol = window.location.protocol;
              const port = window.location.port ? `:${window.location.port}` : '';
              if (host.includes('localhost') || host === '127.0.0.1') {
                window.location.href = `${protocol}//${targetSlug}.localhost${port}/`;
                return;
              }
              const parts = host.split('.');
              if (parts.length >= 2) {
                const root = parts.slice(-2).join('.');
                window.location.href = `${protocol}//${targetSlug}.${root}${port}/`;
                return;
              }
            }
            router.push(`/${targetSlug}`);
            return;
          }
        } catch {
          // If check fails, show standard input
        }
      }
      setIsCheckingSaved(false);
    };

    checkSavedCompanyCode();
  }, [router]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  const executeLookup = async (inputCode: string) => {
    const code = inputCode.trim().toUpperCase();
    if (!code) return;

    setCompanyCode(code);
    setError(null);
    setTargetCompany(null);
    setLookupState("connecting");
    setConnectionProgress(8);

    // Initial slow progress (up to 120s buffer if network is slow)
    const startTime = Date.now();
    const durationMs = 120000; // 2 minutes
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / durationMs, 1);
      const nextProgress = Math.min(88, 8 + progressRatio * 80);
      setConnectionProgress(nextProgress);
    }, 100);

    try {
      const response = await fetch(`/api/company/${encodeURIComponent(code)}`);
      const data = await response.json();

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (!response.ok || !data.exists) {
        // Failed / Not Found: Smoothly complete to 100% with error state
        setConnectionProgress(100);
        setLookupState("failed");
        setError(data.message || `No organization found with ID "${code}".`);
        return;
      }

      // Success: Trigger the cinematic 2-second transition to Point B
      const companySlug = data.company.slug || data.company.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || data.company.code;
      setConnectionProgress(100);
      setTargetCompany({
        name: data.company.name,
        code: data.company.code,
        logo: data.company.logo,
      });

      // Save to recent companies list in localStorage
      if (typeof window !== "undefined") {
        try {
          const newRecent: RecentCompany = {
            code: data.company.code,
            name: data.company.name,
            logo: data.company.logo,
            slug: companySlug,
          };
          setRecentCompanies(prev => {
            const filtered = prev.filter(c => c.code.toUpperCase() !== data.company.code.toUpperCase());
            const updated = [newRecent, ...filtered].slice(0, 4);
            localStorage.setItem("nexushr_recent_companies", JSON.stringify(updated));
            return updated;
          });
        } catch {}
      }

      // After 2.0s smooth travel transition, switch to celebratory success state
      redirectTimeoutRef.current = setTimeout(() => {
        setLookupState("success");

        // Store in cookies for 1-time memory
        if (typeof document !== "undefined") {
          document.cookie = `nexushr_company_code=${encodeURIComponent(data.company.code)}; path=/; max-age=31536000; SameSite=Lax`;
          localStorage.setItem("nexushr_company_code", data.company.code);
        }

        addToast({
          type: "success",
          title: "Organization Verified",
          description: `Connected to ${data.company.name}! Entering portal...`,
        });

        // 2-second hold on the success screen before entering workplace subdomain
        setTimeout(() => {
          if (typeof window !== "undefined") {
            const host = window.location.hostname.toLowerCase();
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : '';

            // Subdomain routing for localhost (webatlas.localhost:3000)
            if (host.includes('localhost') || host === '127.0.0.1') {
              window.location.href = `${protocol}//${companySlug}.localhost${port}/`;
              return;
            }

            // Subdomain routing for production (webatlas.nexus.com)
            const parts = host.split('.');
            if (parts.length >= 2) {
              const root = parts.slice(-2).join('.');
              window.location.href = `${protocol}//${companySlug}.${root}${port}/`;
              return;
            }
          }
          router.push(`/${companySlug}`);
        }, 2000);

      }, 2000); // 2-second transition duration

    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setConnectionProgress(100);
      setLookupState("failed");
      setError("Connection timed out or network error. Please try again.");
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLookup(companyCode);
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

  const handleReset = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    setLookupState("idle");
    setConnectionProgress(0);
    setTargetCompany(null);
    setError(null);
  };

  if (isCheckingSaved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="h-16 w-16 rounded-full bg-[#03081c] p-2 shadow-2xl ring-4 ring-white border border-[#03081c] mb-4 flex items-center justify-center animate-pulse">
          <img src="/logo.png" alt="NexusHR" className="h-full w-full object-contain scale-110" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Verifying Workspace Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50/90 p-4 overflow-hidden select-none">
      {/* Vibrant Light-Mode Ambient Glow Auroras */}
      <div className="absolute -top-[15%] -left-[10%] w-[520px] h-[520px] rounded-full bg-gradient-to-br from-indigo-300/40 via-purple-200/35 to-blue-200/25 blur-[100px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute -bottom-[15%] -right-[10%] w-[580px] h-[580px] rounded-full bg-gradient-to-tl from-teal-200/40 via-sky-200/30 to-indigo-200/35 blur-[110px] pointer-events-none animate-pulse duration-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-indigo-100/30 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e125_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e125_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* 2-Circle Interactive Connecting Animation Arena */}
        {lookupState !== "idle" && (
          <div className="relative mb-6 group animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-300/50 via-purple-300/40 to-teal-300/50 opacity-90 blur-md animate-pulse" />
            
            <Card className="relative shadow-2xl shadow-indigo-900/15 border-white/90 bg-white/95 backdrop-blur-2xl rounded-3xl overflow-hidden p-6 sm:p-8 text-center">
              <div className="space-y-6">
                
                {/* Visual Two-Circle Handshake Stage */}
                <div className="flex items-center justify-center gap-2 sm:gap-5 py-4">
                  
                  {/* Circle A: NexusHR Gateway Logo */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative group/circleA">
                      {/* Ambient Halo */}
                      <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-teal-500/20 blur-md animate-pulse" />
                      <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#03081c] p-2 shadow-2xl ring-4 ring-indigo-100 border border-[#03081c] flex items-center justify-center transition-transform hover:scale-105 duration-300">
                        <img 
                          src="/logo.png" 
                          alt="NexusHR" 
                          className="h-full w-full object-contain scale-110 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                      Nexus<span className="text-indigo-600">HR</span>
                    </span>
                  </div>

                  {/* Connecting Line with 2-Second Smooth Laser Transit */}
                  <div className="flex-1 max-w-[170px] sm:max-w-[210px] flex flex-col items-center gap-2.5 relative">
                    
                    {/* Track Container */}
                    <div className="w-full h-3.5 bg-slate-100/90 rounded-full relative overflow-hidden shadow-inner border border-slate-200/90">
                      {/* Laser Progress Beam with 2-Second Easing Duration */}
                      <div 
                        className={`h-full rounded-full transition-all ease-out ${
                          lookupState === "failed" 
                            ? "bg-red-500 duration-500" 
                            : lookupState === "success" 
                            ? "bg-gradient-to-r from-indigo-600 via-teal-500 to-emerald-500 duration-700" 
                            : "bg-gradient-to-r from-indigo-600 via-purple-500 to-teal-500 duration-[2000ms]"
                        }`}
                        style={{ width: `${connectionProgress}%` }}
                      />
                      
                      {/* Flowing Laser Particle Shimmer */}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.85)_50%,transparent_100%)] animate-[shimmer_1.2s_infinite]" />
                    </div>

                    {/* Glowing Laser Bead - 2-Second Smooth Slide */}
                    <div 
                      className="absolute top-0 -mt-1 pointer-events-none transition-all ease-out duration-[2000ms]"
                      style={{ left: `calc(${connectionProgress}% - 9px)` }}
                    >
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                        lookupState === "failed" 
                          ? "bg-red-500 shadow-[0_0_15px_#ef4444] scale-110" 
                          : lookupState === "success" 
                          ? "bg-emerald-500 shadow-[0_0_18px_#10b981] scale-110" 
                          : "bg-indigo-600 shadow-[0_0_15px_#6366f1] animate-pulse"
                      }`}>
                        <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>

                    {/* Stage Label */}
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500">
                      <Zap className={`h-3 w-3 ${lookupState === 'failed' ? 'text-rose-500' : 'text-indigo-600 animate-pulse'}`} />
                      <span>
                        {lookupState === "connecting" && (connectionProgress >= 100 ? "Syncing..." : `${Math.round(connectionProgress)}%`)}
                        {lookupState === "success" && "Connected ✓"}
                        {lookupState === "failed" && "Not Reached"}
                      </span>
                    </div>
                  </div>

                  {/* Circle B: Target Organization Result */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative group/circleB">
                      
                      {/* Connecting State */}
                      {lookupState === "connecting" && (
                        <>
                          <div className="absolute -inset-3 rounded-full border-2 border-dashed border-indigo-400/80 animate-spin [animation-duration:5s]" />
                          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-2 shadow-xl ring-4 ring-white border border-indigo-200 flex items-center justify-center animate-pulse">
                            <Building2 className="h-9 w-9 text-indigo-500 animate-bounce [animation-duration:2s]" />
                          </div>
                        </>
                      )}

                      {/* Success State (Point B Reached) */}
                      {lookupState === "success" && targetCompany && (
                        <div className="animate-in zoom-in-75 duration-500 relative">
                          <div className="absolute -inset-3 rounded-full bg-emerald-400/30 blur-lg animate-pulse" />
                          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#03081c] p-2 shadow-2xl ring-4 ring-emerald-200 border border-[#03081c] flex items-center justify-center">
                            {targetCompany.logo ? (
                              <img 
                                src={targetCompany.logo} 
                                alt={targetCompany.name} 
                                className="h-full w-full object-contain scale-110" 
                              />
                            ) : (
                              <Building2 className="h-10 w-10 text-emerald-400" />
                            )}
                          </div>
                          <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-in zoom-in duration-300">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </div>
                        </div>
                      )}

                      {/* Not Reached State */}
                      {lookupState === "failed" && (
                        <div className="animate-in zoom-in-75 duration-300 relative">
                          <div className="absolute -inset-2 rounded-full bg-rose-500/15 blur-md" />
                          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-rose-50 p-2 shadow-xl ring-4 ring-rose-100 border border-rose-200 flex items-center justify-center">
                            <X className="h-10 w-10 text-rose-500 stroke-[2.5]" />
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-slate-800 max-w-[90px] sm:max-w-[110px] truncate">
                      {lookupState === "connecting" && "Target Workspace"}
                      {lookupState === "success" && (targetCompany?.name || targetCompany?.code)}
                      {lookupState === "failed" && "Not Reached"}
                    </span>
                  </div>

                </div>

                {/* Status Message & Action Area */}
                <div className="pt-3 border-t border-slate-100">
                  {lookupState === "connecting" && (
                    <p className="text-xs text-slate-500 font-medium">
                      Connecting to <span className="font-mono font-bold text-indigo-600">{companyCode}</span>...
                    </p>
                  )}

                  {lookupState === "success" && (
                    <p className="text-sm font-bold text-emerald-600 animate-in fade-in duration-300">
                      Connected to {targetCompany?.name}
                    </p>
                  )}

                  {lookupState === "failed" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs text-slate-500 font-medium">
                        Not reached with ID <span className="font-mono font-bold text-slate-700">{companyCode}</span>
                      </p>
                      <Button 
                        type="button" 
                        onClick={handleReset}
                        className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Try Again
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </Card>
          </div>
        )}

        {/* Default Lookup Card (Visible when idle) */}
        {lookupState === "idle" && (
          <>
            {/* Minimal Logo */}
            <div className="mb-6 text-center">
              <div className="relative mx-auto mb-3 inline-block group">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-indigo-400/30 via-purple-400/20 to-teal-400/30 opacity-70 blur-lg transition duration-500 group-hover:scale-105" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#03081c] p-2 shadow-2xl shadow-slate-900/20 ring-4 ring-white border border-[#03081c]">
                  <img 
                    src="/logo.png" 
                    alt="NexusHR" 
                    className="h-full w-full object-contain scale-110" 
                  />
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-600">HR</span>
              </h1>
            </div>

            {/* Minimal Glass Card */}
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-indigo-200/60 via-purple-100/40 to-teal-200/50 opacity-80 blur-sm" />
              
              <Card className="relative shadow-2xl shadow-indigo-900/5 border-white/80 bg-white/90 backdrop-blur-2xl rounded-3xl overflow-hidden p-6 sm:p-7">
                <div className="mb-4 text-center">
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Enter Company ID
                  </h2>
                </div>

                <form onSubmit={handleLookup} className="space-y-4">
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
                      className="pl-10 h-12 uppercase font-mono tracking-widest font-black text-sm rounded-xl bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                      required
                      autoFocus
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-teal-600 hover:from-indigo-700 hover:via-indigo-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all duration-200 active:scale-[0.98]" 
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>

                {/* Recent / Previously Added Workplaces */}
                {recentCompanies.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Recent Workplaces
                    </p>
                    <div className="space-y-1.5">
                      {recentCompanies.map((recent) => (
                        <div
                          key={recent.code}
                          onClick={() => executeLookup(recent.code)}
                          className="group/recent w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/70 hover:border-indigo-200 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-[#03081c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              {recent.logo ? (
                                <img src={recent.logo} alt={recent.name} className="h-full w-full object-contain p-1" />
                              ) : (
                                recent.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-slate-800 group-hover/recent:text-indigo-900 truncate">
                                {recent.name}
                              </p>
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {recent.code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-semibold text-indigo-600 group-hover/recent:translate-x-0.5 transition-transform flex items-center gap-1">
                              Open <ArrowRight className="h-3 w-3" />
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecent(e, recent.code)}
                              title="Remove from history"
                              className="h-5 w-5 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors ml-1"
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
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <Link href="/candidate-login" className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-3 w-3" /> Candidate Portal
                  </Link>
                  <Link href="/register" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                    Register Company <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
