"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { 
  Building2, Users, Clock, Calendar, CreditCard, ShieldCheck, 
  MapPin, TrendingUp, CheckCircle, ArrowRight, GitBranch, 
  Kanban, CheckSquare, UserPlus, Menu, X, ChevronRight, FileText,
  Zap, Layers, Lock, Shield, CheckCircle2, Play,
  Smartphone, ArrowUpRight, BarChart3, Fingerprint, Award,
  Check, Terminal, Compass, RefreshCw, Volume2, VolumeX
} from "lucide-react";
import { 
  playTactileClick, 
  playRadarScan, 
  playSuccessChime, 
  playTabTick 
} from "@/lib/soundEffects";

function TiltCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [4, -4]), { stiffness: 240, damping: 25 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-4, 4]), { stiffness: 240, damping: 25 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0.5);
    y.set(0.5);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [searchStatusText, setSearchStatusText] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 45]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  const sfx = {
    click: () => { if (soundEnabled) playTactileClick(); },
    scan: () => { if (soundEnabled) playRadarScan(); },
    success: () => { if (soundEnabled) playSuccessChime(); },
    tick: () => { if (soundEnabled) playTabTick(); },
  };

  const triggerCompanySearch = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;
    setIsSearchingCompany(true);
    sfx.scan();
    setSearchStatusText(`Scanning enterprise cluster for [${cleanCode}]...`);

    setTimeout(() => {
      sfx.success();
      setSearchStatusText(`Tenant domain resolved: nexushr.app/${cleanCode}`);
      setTimeout(() => {
        router.push(`/${cleanCode}`);
      }, 350);
    }, 450);
  };

  const handleCompanyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyCode.trim() && !isSearchingCompany) {
      triggerCompanySearch(companyCode);
    }
  };

  const operationalMetrics = [
    { value: "15,000+", label: "Verified Daily Check-ins", detail: "Sub-meter GPS validated", icon: <Fingerprint className="h-4 w-4 text-teal-400" /> },
    { value: "99.98%", label: "Payroll Audit Accuracy", detail: "Automated tax & overtime", icon: <Award className="h-4 w-4 text-indigo-400" /> },
    { value: "< 120ms", label: "GitHub Webhook Latency", detail: "Instant branch-to-sprint", icon: <GitBranch className="h-4 w-4 text-amber-400" /> },
    { value: "100%", label: "Tamper-Proof Audit Trail", detail: "Zero proxy clock-ins", icon: <ShieldCheck className="h-4 w-4 text-cyan-400" /> }
  ];

  const onboardingSteps = [
    { step: "01", title: "Define Boundary Coordinates", desc: "Input your office GPS center point and set polygon or radial boundaries in meters." },
    { step: "02", title: "Map Repositories & Teams", desc: "Link GitHub repositories to PMS projects for automated sprint status transitions on branch push." },
    { step: "03", title: "Distribute QR Device Linking", desc: "Staff pair their personal mobile phones via secure QR token with hardware lock-in." },
    { step: "04", title: "Autonomous Operations", desc: "Attendance logs, shift overtime, EOD sprint summaries, and payroll close automatically." }
  ];

  return (
    <div className="min-h-screen bg-[#060911] text-[#f8fafc] font-sans selection:bg-teal-600 selection:text-white antialiased">
      
      {/* Architectural Background Grid & Subtle Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-48 left-1/3 w-[650px] h-[650px] bg-teal-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] -right-28 w-[550px] h-[550px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Navigation Header */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#060911]/90 backdrop-blur-xl border-b border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center p-0.5 shadow-md shadow-teal-500/20 transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="NexusHR Logo" 
                  className="h-full w-full object-contain rounded-[10px]" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Nexus<span className="text-teal-400">HR</span>
                  <span className="text-[10px] font-mono tracking-normal bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold px-2 py-0.5 rounded-full uppercase ml-1">
                    Version 2.0
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Enterprise People & Project Console</span>
              </div>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
              <a href="#geofence-engine" className="hover:text-teal-400 transition-colors">Geo-Fencing</a>
              <a href="#github-engine" className="hover:text-teal-400 transition-colors">GitHub Sync</a>
              <a href="#workflow" className="hover:text-teal-400 transition-colors">Workflow</a>
              <a href="#architecture" className="hover:text-teal-400 transition-colors">Architecture</a>
            </div>

            {/* Direct Action Portal */}
            <div className="hidden md:flex items-center gap-3">
              {/* Sound Effects Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !soundEnabled;
                  setSoundEnabled(nextState);
                  if (nextState) playSuccessChime();
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  soundEnabled
                    ? "bg-teal-500/15 border-teal-500/30 text-teal-300 hover:bg-teal-500/25"
                    : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                }`}
                title={soundEnabled ? "Sound FX Active (Click to mute)" : "Sound FX Muted (Click to enable)"}
                aria-label="Toggle Sound Effects"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <Link href="/login" onClick={sfx.click}>
                <Button variant="outline" className="border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white rounded-xl px-4 py-2 text-xs font-semibold transition-all">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={sfx.click}>
                <Button className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-lg shadow-teal-600/25 transition-all">
                  Register Company
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Trigger */}
            <button 
              className="md:hidden p-2 text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#090e1c] border-b border-white/10 px-4 py-6 space-y-4 overflow-hidden"
            >
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-teal-400 font-medium">Features</a>
              <a href="#geofence-engine" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-teal-400 font-medium">Geo-Fencing</a>
              <a href="#github-engine" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-teal-400 font-medium">GitHub Sync</a>
              <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-teal-400 font-medium">Workflow</a>
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full border-white/20 text-slate-200">Sign In</Button>
                </Link>
                <Link href="/register" className="block w-full">
                  <Button className="w-full bg-teal-600 text-white">Register Company</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section: Asymmetric Composition with Logo-Free 3D Product Visual */}
      <section ref={heroRef} className="relative z-10 pt-36 pb-20 lg:pt-44 lg:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Direct Editorial Voice & Direct Portal Access */}
            <motion.div 
              style={{ opacity: heroOpacity }}
              className="lg:col-span-5 space-y-7 text-left"
            >
              {/* Telemetry Status Line */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="font-bold text-teal-200">VERSION 2.0 RELEASED</span>
                <span className="text-slate-500">•</span>
                <span>GEO-PRESENCE & SPRINT ENGINE</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
                NexusHR <span className="text-teal-400">Version 2</span>.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-300">
                  Unified People, Payroll & Sprints.
                </span>
              </h1>

              {/* Precise Value Proposition */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                NexusHR Version 2 re-engineers enterprise workforce operations from the ground up: sub-meter GPS geo-fenced attendance, 
                automated GitHub webhook branch-to-sprint syncing, autonomous payroll calculations, and rotational shift commitment logs.
              </p>

              {/* Direct Company Portal Action Bar */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                    <Link href="/register" onClick={sfx.click} className="block shrink-0">
                      <Button className="h-12 w-full sm:w-auto px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-xl shadow-teal-600/30 transition-all cursor-pointer">
                        Start 14-Day Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </motion.div>

                  {/* Company Quick-Code Search Pill with Radar Scanline & Sound FX */}
                  <form 
                    onSubmit={handleCompanyLogin}
                    className={`relative flex items-center bg-white/[0.04] border rounded-xl p-1 transition-all overflow-hidden ${
                      isSearchingCompany
                        ? "border-teal-400 bg-teal-950/30 shadow-lg shadow-teal-500/25 ring-2 ring-teal-500/30"
                        : "border-white/15 focus-within:border-teal-400 hover:border-white/30"
                    }`}
                  >
                    {/* Sweeping Radar Scanbeam */}
                    {isSearchingCompany && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-teal-400/40 to-transparent pointer-events-none"
                      />
                    )}

                    <div className="relative flex items-center pl-3">
                      <Building2 className={`h-4 w-4 transition-colors ${isSearchingCompany ? "text-teal-400 animate-pulse" : "text-slate-400"}`} />
                      <input
                        type="text"
                        value={companyCode}
                        onChange={(e) => {
                          setCompanyCode(e.target.value);
                          sfx.tick();
                        }}
                        disabled={isSearchingCompany}
                        placeholder="COMPANY CODE"
                        className="w-36 sm:w-32 px-2 py-2 bg-transparent text-white placeholder:text-slate-500 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none disabled:opacity-70"
                      />
                    </div>
                    <motion.div whileTap={{ scale: 0.94 }}>
                      <Button 
                        type="submit" 
                        variant="secondary" 
                        disabled={isSearchingCompany}
                        className="h-10 px-3.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold font-mono transition-all disabled:opacity-80 cursor-pointer"
                      >
                        {isSearchingCompany ? (
                          <span className="flex items-center gap-1.5 text-teal-300">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Locating</span>
                          </span>
                        ) : (
                          <span>Enter</span>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </div>

                {/* Real-time Status / Live Searching HUD Feedback */}
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {isSearchingCompany && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        className="flex items-center gap-2 text-[11px] font-mono text-teal-300 bg-teal-950/70 border border-teal-500/40 px-3 py-1.5 rounded-lg shadow-lg shadow-teal-950/50"
                      >
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                        </span>
                        <span className="truncate">{searchStatusText}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isSearchingCompany && companyCode.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 pl-1"
                    >
                      <span className="text-teal-400 font-bold">●</span>
                      <span>Target: <strong className="text-teal-300 font-semibold">nexushr.app/{companyCode.toUpperCase()}</strong></span>
                    </motion.div>
                  )}

                  {/* Quick Demo Code Clickable Pills with Sound */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 pt-0.5">
                    <span className="text-slate-500">Quick demo:</span>
                    {["ACME", "DEMO", "GLOBAL"].map((code) => (
                      <motion.button
                        key={code}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setCompanyCode(code);
                          sfx.click();
                          triggerCompanySearch(code);
                        }}
                        className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 hover:border-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all cursor-pointer font-bold"
                      >
                        {code}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-teal-400" /> Zero credit card required</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-teal-400" /> Multi-tenant isolation</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Logo-Free 3D Dashboard Showcase Graphic */}
            <motion.div
              style={{ y: heroParallaxY }}
              className="lg:col-span-7 relative"
            >
              {/* Diffuse Lighting Glow Behind Mockup */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-indigo-500/20 rounded-3xl blur-3xl opacity-75" />

              <TiltCard className="relative rounded-3xl border border-white/15 bg-[#0a1020]/95 backdrop-blur-xl p-3 sm:p-4 shadow-2xl shadow-black/80 overflow-hidden">
                
                {/* Clean Neutral Topbar (Zero Logos as requested) */}
                <div className="flex items-center justify-between pb-3 px-3 border-b border-white/10 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-teal-500/80" />
                    <span className="ml-2.5 text-slate-400 text-[11px] hidden sm:inline">console.internal/operations/matrix • NexusHR Version 2</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-teal-400 font-semibold font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                      VERSION 2.0 • TELEMETRY VERIFIED
                    </span>
                    <span className="text-slate-500 font-mono hidden sm:inline">CYCLE 26.10</span>
                  </div>
                </div>

                {/* Newly Generated Logo-Free 3D Isometric Dashboard Graphic */}
                <div className="relative mt-2.5 rounded-2xl overflow-hidden border border-white/10 aspect-[16/9] w-full bg-[#050811]">
                  <Image
                    src="/hero-showcase.jpg"
                    alt="Enterprise Operations Dashboard Visual Showcase"
                    fill
                    priority
                    className="object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                  />

                  {/* Gradient Vignette for Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060911]/80 via-transparent to-transparent pointer-events-none" />

                  {/* Interactive Operational Chip 1: Geo-Fence Status */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="absolute bottom-5 left-5 hidden sm:flex items-center gap-3 bg-[#0a1020]/90 border border-teal-500/30 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl shadow-black/80"
                  >
                    <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">HQ Geo-Fence Boundary</div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        148 / 152 Present
                        <span className="text-[9px] font-mono font-semibold text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded">15.0m Radius</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Interactive Operational Chip 2: GitHub Webhook Ticket Update */}
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="absolute top-5 right-5 hidden sm:flex items-center gap-3 bg-[#0a1020]/90 border border-purple-500/30 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl shadow-black/80"
                  >
                    <div className="h-8 w-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-slate-400 font-mono">PUSH EVENT SYNCED</div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span className="text-purple-300">TSK26070010</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">IN_PROGRESS</span>
                      </div>
                    </div>
                  </motion.div>

                </div>
              </TiltCard>
            </motion.div>

          </div>

          {/* Social Proof & Quantitative Operational Metrics Strip */}
          <div className="mt-20 pt-10 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-6">
            {operationalMetrics.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 text-left space-y-1.5 backdrop-blur-sm hover:border-teal-500/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">{item.value}</div>
                <div className="text-[11px] text-slate-500">{item.detail}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Deep-Dive 1: Geo-Fence Presence Engine */}
      <section id="geofence-engine" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#070c18]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual: Live Geo-Fence Radar Map Card */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl relative overflow-hidden text-left space-y-5">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Compass className="h-5 w-5 text-teal-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Live Office Radar Boundary</h4>
                      <p className="text-[11px] text-slate-400 font-mono">28.6139° N, 77.2090° E • 15.0m Radius</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded">
                    POLYGON LOCKED
                  </span>
                </div>

                {/* Radar Circle Simulation */}
                <div className="relative h-56 rounded-2xl bg-[#060911] border border-white/10 flex items-center justify-center overflow-hidden">
                  <div className="absolute h-48 w-48 rounded-full border border-teal-500/20 animate-ping opacity-30" />
                  <div className="absolute h-36 w-36 rounded-full border border-teal-500/30" />
                  <div className="absolute h-20 w-20 rounded-full border border-teal-500/50 bg-teal-500/10" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/40">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-white mt-1.5">Corporate HQ</span>
                    <span className="text-[10px] text-teal-400 font-mono">Active Verification Zone</span>
                  </div>

                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-slate-300">
                    Accuracy: ±1.2m
                  </div>
                </div>

                {/* Verified Audit Log Feed */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500">PUNCH TIME</span>
                    <div className="font-bold text-white mt-0.5">08:56:12 AM</div>
                    <span className="text-[10px] text-teal-400">Office Physical Mode</span>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500">HARDWARE PAIRING</span>
                    <div className="font-bold text-white mt-0.5">Device NX-9482</div>
                    <span className="text-[10px] text-cyan-400">Hardware Bound</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-300 rounded-full text-xs font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                ANTI-SPOOFING GPS PROTOCOL
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
                Guaranteed Physical Presence.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                  Zero Proxy Punches.
                </span>
              </h2>

              <p className="text-slate-300 text-base leading-relaxed">
                Traditional punch systems suffer from fake GPS extensions and proxy sign-ins. NexusHR solves this with multi-point geographic radius verification and hardware token binding.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Sub-Meter Boundary Precision</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Define multi-point polygons or radius boundaries that prevent off-premises clock-ins.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live WebSocket Presence Telemetry</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time attendance matrices update automatically across admin screens without page refreshes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Encrypted QR Hardware Device Binding</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pair employee phones with cryptographic tokens, preventing logins from unauthorized secondary devices.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Deep-Dive 2: GitHub Webhook Sprint Sync Engine */}
      <section id="github-engine" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#060911]">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-full text-xs font-mono">
                <GitBranch className="h-3.5 w-3.5" />
                ENGINEERING SYNCHRONIZATION
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
                Push Code to Shift Sprints.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-teal-300">
                  Zero Manual Updates.
                </span>
              </h2>

              <p className="text-slate-300 text-base leading-relaxed">
                Connect your software engineering repositories directly to PMS project boards. Whenever an engineer creates or pushes a branch containing a ticket key, the card shifts across your Kanban board autonomously.
              </p>

              <div className="space-y-3 pt-2 font-mono text-xs">
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <span>Branch: <code className="text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">feature/TSK26070010-auth</code></span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <span>Webhook Event: <code className="text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">HTTP POST /api/webhooks/github</code></span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <span>Kanban Transition: <code className="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">To Do → In Progress</code></span>
                </div>
              </div>
            </div>

            {/* Live Webhook Terminal Visual */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-white/10 bg-[#080d1a] p-6 shadow-2xl text-left font-mono space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-400" />
                    <span>github-webhook-handler.ts</span>
                  </div>
                  <span className="text-emerald-400 font-bold">LISTENER 200 OK</span>
                </div>

                <div className="space-y-2 text-xs leading-relaxed text-slate-300 bg-[#04060d] border border-white/5 rounded-2xl p-4">
                  <p><span className="text-purple-400 font-bold">&quot;ref&quot;</span>: <span className="text-emerald-300">&quot;refs/heads/feature/TSK26070010-auth&quot;</span>,</p>
                  <p><span className="text-purple-400 font-bold">&quot;repository&quot;</span>: <span className="text-emerald-300">&quot;nexushr/enterprise-core&quot;</span>,</p>
                  <p><span className="text-purple-400 font-bold">&quot;pusher&quot;</span>: <span className="text-emerald-300">&quot;anirudh@nexushr.app&quot;</span>,</p>
                  <p><span className="text-purple-400 font-bold">&quot;head_commit&quot;</span>: &#123; <span className="text-slate-400">&quot;id&quot;</span>: <span className="text-teal-300">&quot;f8c92a1&quot;</span> &#125;</p>
                  <div className="pt-3 mt-3 border-t border-white/10 text-amber-300 font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                    Sprint Board Updated: TSK26070010 shifted to &quot;IN_PROGRESS&quot;
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                  <span>Latency: 48ms</span>
                  <span className="text-teal-400">Audit trail logged</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Bento Grid: 6 Comprehensive Capabilities */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#070c18]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-teal-400">WHAT&apos;S NEW IN VERSION 2.0</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Re-engineered for Scale, Precision & Speed.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              NexusHR Version 2 introduces real-time sub-meter GPS polygons, week-wise timesheet matrices, automated GitHub branch sprint sync, and autonomous payroll audits into a single unified console.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-teal-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Geo-Fenced Clock-In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Sub-meter GPS polygon boundary validation, shift tracking, and WFH mode shifts with zero proxy sign-ins.</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-purple-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <Kanban className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Agile PMS & Sprints</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Sprint boards with story estimation, automated GitHub branch synchronization, and backlog prioritization.</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-indigo-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Automated Payroll</h3>
              <p className="text-xs text-slate-400 leading-relaxed">One-click salary computation based on verified attendance, overtime hours, and tax deductions with PDF payslips.</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <CheckSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Today&apos;s Task & EOD Reports</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Daily task commitments with shift unlock timers, 15m–8h estimation limits, and manager review feeds.</p>
            </div>

            {/* Card 5 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Leave & Overtime Approvals</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Multi-tiered approval workflows, real-time balance quotas, loss-of-pay calculations, and audit history.</p>
            </div>

            {/* Card 6 */}
            <div className="bg-white/[0.02] border border-white/[0.08] hover:border-rose-500/40 p-6 rounded-3xl space-y-4 text-left transition-all group">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <UserPlus className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Recruitment & Org Directory</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Candidate pipeline inboxes, job posting syndication, department hierarchies, and employee offboarding.</p>
            </div>

          </div>

        </div>
      </section>

      {/* Onboarding in 4 Steps */}
      <section id="workflow" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#060911]">
        <div className="max-w-7xl mx-auto text-left">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-teal-400">RAPID DEPLOYMENT</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Live in 4 Simple Steps</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {onboardingSteps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-teal-500/40 p-6 rounded-3xl space-y-3 relative overflow-hidden group transition-all"
              >
                <span className="text-4xl font-mono font-black text-teal-500/20 group-hover:text-teal-400 transition-colors block">
                  {step.step}
                </span>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Security & Architecture Section */}
      <section id="architecture" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#070c18]">
        <div className="max-w-4xl mx-auto space-y-12 text-left">
          
          <div className="space-y-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Enterprise Compliance & Data Architecture
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
              NexusHR protects sensitive employee payroll, personal identification, and location records with defense-in-depth isolation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-400" /> Multi-Tenant Isolation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every organization operates in isolated data scopes with dedicated JWT tokens and company-scoped database indexes.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-cyan-400" /> Cryptographic Hardware Binding
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Device fingerprints and rotating QR tokens guarantee check-ins originate exclusively from approved personal hardware.
              </p>
            </div>
          </div>

          {/* Bottom Call to Action Banner */}
          <div className="bg-gradient-to-r from-teal-950/40 via-[#0d162a] to-indigo-950/40 border border-teal-500/30 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold text-white">Ready to modernize your workforce operations?</h4>
              <p className="text-xs text-slate-400">Launch your company workspace in under two minutes with zero commitment.</p>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} className="shrink-0">
              <Link href="/register" onClick={sfx.click}>
                <Button className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl px-6 py-3 shadow-lg shadow-teal-600/30 cursor-pointer">
                  Register Company
                </Button>
              </Link>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-16 bg-[#04060d] text-slate-400 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center p-0.5 shadow-sm shrink-0 overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="NexusHR Logo" 
                    className="h-full w-full object-contain rounded-lg" 
                  />
                </div>
                <span className="text-base font-bold text-white flex items-center gap-1.5">
                  NexusHR <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.2 rounded">Version 2.0</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                NexusHR Version 2: Enterprise workforce and project operations console. Unifying sub-meter geo-presence, automated payroll, and GitHub sprint automation.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-teal-400 transition-colors">Features</a></li>
                <li><a href="#geofence-engine" className="hover:text-teal-400 transition-colors">Geo-Fencing</a></li>
                <li><a href="#github-engine" className="hover:text-teal-400 transition-colors">GitHub Sync</a></li>
                <li><Link href="/login" className="hover:text-teal-400 transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-teal-400 transition-colors">Register Company</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com/Anirudh3434" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">GitHub Repository</a></li>
                <li><a href="https://github.com/Anirudh3434/nexus-hr-websocket" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">WebSocket Server</a></li>
                <li><a href="https://github.com/Anirudh3434?tab=repositories" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">All Repositories</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Compliance</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span>ISO 27001 Readiness</span></li>
                <li><span>GDPR Data Minimization</span></li>
                <li><span>Encrypted Audit Logs</span></li>
                <li><span>Role-Based Permissions</span></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-mono">© 2026 NexusHR. All rights reserved. Built by Anirudh Bhardwaj.</p>
            <div className="flex gap-5 text-xs font-semibold text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
              <a href="https://github.com/Anirudh3434" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
