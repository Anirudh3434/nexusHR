"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import HRChatbot from "@/components/ai/HRChatbot";
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  MapPin, 
  ArrowRight, 
  GitBranch, 
  Kanban, 
  CheckSquare, 
  UserPlus, 
  Menu, 
  X, 
  ChevronRight, 
  Zap, 
  Lock, 
  Shield, 
  Check, 
  Sparkles,
  BarChart3,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  Headphones,
  PartyPopper,
  FileText
} from "lucide-react";

export default function LandingOverviewPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [activeMascotTab, setActiveMascotTab] = useState<"policy" | "security" | "ideas" | "culture" | "support">("policy");
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = companyCode.trim().toUpperCase();
    if (clean) {
      router.push(`/${clean}`);
    }
  };

  const getDashboardDestination = () => {
    if (!user) return "/dashboard";
    if ((user.role as string) === "super_admin") return "/super-admin";
    if (user.isCandidate) return "/candidate/dashboard";
    return "/dashboard";
  };

  const capabilities = [
    {
      icon: <MapPin className="h-5 w-5 text-teal-400" />,
      title: "Geo-Fenced Attendance",
      description: "Sub-meter polygon boundaries and live field tracking with cryptographic device binding to eliminate proxy punches."
    },
    {
      icon: <CreditCard className="h-5 w-5 text-indigo-400" />,
      title: "Automated Payroll",
      description: "Instant salary computation from verified attendance, overtime, bonuses, and tax deductions with one-click payslips."
    },
    {
      icon: <GitBranch className="h-5 w-5 text-purple-400" />,
      title: "Agile PMS & Git Sync",
      description: "Autonomous sprint board tracking with direct GitHub webhook integration — push code to transition task states."
    },
    {
      icon: <Calendar className="h-5 w-5 text-emerald-400" />,
      title: "Leave & Shift Planning",
      description: "Custom leave quotas, multi-level approval hierarchies, rotational shift scheduling, and real-time availability."
    },
    {
      icon: <CheckSquare className="h-5 w-5 text-cyan-400" />,
      title: "Daily Tasks & EOD Reports",
      description: "Morning task commitments with shift-lock gates, time estimation bounds, and automated daily end-of-day summaries."
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-amber-400" />,
      title: "Enterprise Roles & Perms",
      description: "Granular multi-tenant RBAC down to per-module permissions, field-level access, and encrypted audit trails."
    }
  ];

  const metrics = [
    { label: "Punch Accuracy", value: "99.98%", sub: "Verified via hardware GPS" },
    { label: "Payroll Processing", value: "< 2 min", sub: "Fully automated calculations" },
    { label: "Webhook Sync", value: "< 50 ms", sub: "Real-time GitHub & event latency" },
    { label: "Data Isolation", value: "100%", sub: "Multi-tenant tenant partition" }
  ];

  const mascotFeatures = {
    policy: {
      name: "Policy & Leave Intelligence",
      role: "Knowledge Navigator",
      badge: "Instant 100% Citations",
      image: "/images/mascot/nexi_working_trans.png",
      headline: "Zero-Latency Answers with Exact Policy Citations",
      description: "Nexi ingests employee handbooks, PTO allowances, and health benefits, delivering instant, reliable answers with page-level citations.",
      prompt: "How many PTO days do I have available this quarter?",
      response: "You have 14 accrued PTO days. 2 days were approved for Dec 24-25. Your balance re-ups on Jan 1.",
      tags: ["PTO Calculations", "Company Holidays", "Benefit Packages", "Handbook RAG"]
    },
    security: {
      name: "Zero-Trust Security & Devices",
      role: "Compliance Sentinel",
      badge: "Hardware-Bound GPS",
      image: "/images/mascot/nexi_security_trans.png",
      headline: "Cryptographic Geofencing & Single-Device Binding",
      description: "Nexi enforces biometric check-in boundaries and cryptographically signs device tokens to prevent unauthorized or spoofed punches.",
      prompt: "Can I punch in from the remote client site today?",
      response: "Client site geofence verified (Polygon ID #04). Single device fingerprint matches your registered MacBook Pro.",
      tags: ["Hardware GPS", "Single-Device Binding", "Anti-Spoofing", "Row-Level Security"]
    },
    ideas: {
      name: "Smart Insights & Sprint Flow",
      role: "Agile Optimization",
      badge: "Proactive Suggestions",
      image: "/images/mascot/nexi_idea_trans.png",
      headline: "Automated Overtime Balancing & Sprint Burnout Guardrails",
      description: "Nexi monitors active sprint boards and overtime hours in real-time, proactively surfacing bottleneck alerts and recommendations.",
      prompt: "What is our team velocity trajectory for Sprint 14?",
      response: "Current delivery rate is 94%. Recommend re-assigning 2 backlog items to avoid Friday overtime limits.",
      tags: ["Sprint Forecasting", "Overtime Alerts", "Workload Rebalancing", "Git Webhooks"]
    },
    culture: {
      name: "Milestones & Workplace Culture",
      role: "Engagement Ally",
      badge: "Celebration Engine",
      image: "/images/mascot/nexi_celebration_trans.png",
      headline: "Automated Anniversaries, Holidays & Onboarding Wins",
      description: "Foster community without manual HR overhead. Nexi coordinates team birthday wishes, milestone shoutouts, and onboarding check-ins.",
      prompt: "Upcoming company observances this month?",
      response: "🎉 Gaurav celebrates his 2-year anniversary on Thursday! Office closed Friday for the official holiday.",
      tags: ["Work Anniversaries", "Holiday Calendars", "Onboarding Milestones", "Peer Recognition"]
    },
    support: {
      name: "24/7 Human & IT Helpdesk",
      role: "Resolution Concierge",
      badge: "Seamless Escalations",
      image: "/images/mascot/nexi_support_trans.png",
      headline: "Instant Escalation to HR Leaders & IT Support",
      description: "When an inquiry requires human sign-off or hardware replacement, Nexi automatically opens a priority ticket and loops in the right team.",
      prompt: "My laptop battery is swelling and needs replacement.",
      response: "Urgent IT asset ticket #HD-8422 created. Notified IT Operations with high priority for same-day swap.",
      tags: ["Priority Tickets", "IT Hardware Swap", "HR Escalation", "Confidential Grievance"]
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-teal-500/30 selection:text-teal-200 antialiased overflow-x-hidden">
      
      {/* Background Architectural Mesh & Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-teal-500/10 via-indigo-500/5 to-transparent blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b14]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-full bg-white p-1 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="NexusHR Logo" 
                  className="h-full w-full object-contain rounded-full" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  Nexus<span className="text-teal-400">HR</span>
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  Enterprise
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
              <a href="#nexi" className="flex items-center gap-1.5 text-teal-300 hover:text-teal-200 transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                Meet Nexi
              </a>
              <a href="#features" className="hover:text-white transition-colors">Platform</a>
              <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
            </nav>

            {/* CTA Portal */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && user ? (
                <Link href={getDashboardDestination()}>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold h-9 px-4 rounded-lg shadow-sm shadow-teal-600/30">
                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold h-9 px-4">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold h-9 px-4 rounded-lg shadow-sm shadow-teal-600/30">
                      Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button 
              className="md:hidden p-2 text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0a0f1d] border-b border-white/10 px-4 py-5 space-y-3"
            >
              <a href="#nexi" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-teal-300 hover:text-teal-200 font-semibold py-1">✨ Meet Nexi AI</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300 hover:text-white font-medium py-1">Platform</a>
              <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300 hover:text-white font-medium py-1">Capabilities</a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300 hover:text-white font-medium py-1">Security</a>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {!loading && user ? (
                  <Link href={getDashboardDestination()} className="w-full">
                    <Button className="w-full h-10 bg-teal-600 text-white text-xs font-bold">
                      <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="w-full">
                      <Button variant="outline" className="w-full h-10 border-white/15 text-slate-200 text-xs">Sign In</Button>
                    </Link>
                    <Link href="/register" className="w-full">
                      <Button className="w-full h-10 bg-teal-600 text-white text-xs font-bold">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-7">
          
          {/* Nexi Spotlight Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-teal-500/10 via-indigo-500/15 to-purple-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold backdrop-blur-md shadow-sm">
            <span className="relative flex h-5 w-5 rounded-full overflow-hidden border border-teal-400/50 shadow-xs bg-indigo-950/60 shrink-0">
              <img 
                src="/images/mascot/nexi_welcoming_avatar.png" 
                alt="Nexi" 
                className="w-full h-full object-cover object-top scale-115 translate-y-0.5" 
              />
            </span>
            <span>Meet Nexi &middot; Autonomous HR &amp; Agile Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            The operating system for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-200 to-indigo-300">
              modern engineering teams.
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            All-in-one HR operations, automated payroll, geo-fenced attendance, and agile sprint boards. Connect your people and code in one clean workspace.
          </p>

          {/* CTA & Company Direct Access Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-lg mx-auto w-full">
            {!loading && user ? (
              <Link href={getDashboardDestination()} className="w-full">
                <Button className="w-full h-12 px-7 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/25">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto shrink-0">
                  <Button className="w-full sm:w-auto h-12 px-7 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/25">
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                {/* Quick Organization Code Input */}
                <form onSubmit={handleCompanySubmit} className="flex-1 w-full sm:w-auto h-12 flex items-center justify-between bg-white/[0.04] border border-white/15 rounded-xl p-1.5 focus-within:border-teal-500/50 focus-within:bg-white/[0.06] transition-all">
                  <div className="flex items-center pl-2.5 flex-1 min-w-0">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      placeholder="COMPANY CODE"
                      className="w-full px-2.5 py-1.5 bg-transparent text-white placeholder:text-slate-500 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    variant="secondary"
                    size="sm"
                    className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 transition-all"
                  >
                    Enter <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </form>
              </>
            )}
          </div>

          {/* Quick trust reassurance */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-400" /> Free 14-day trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-400" /> Multi-tenant isolation
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-400" /> Instant setup
            </span>
          </div>

          {/* Product Showcase Window with Nexi Keynote Presenter */}
          <div id="features" className="pt-10 sm:pt-14 relative max-w-6xl mx-auto">
            <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-transparent p-2 sm:p-3 shadow-2xl shadow-black/80 backdrop-blur-sm">
              <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 relative aspect-[16/9] w-full bg-[#040711]">
                <Image
                  src="/hero-showcase.jpg"
                  alt="NexusHR Enterprise Workspace Showcase"
                  fill
                  priority
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent opacity-60 pointer-events-none" />
              </div>
            </div>

            {/* Floating 3D Nexi Keynote Presentation Callout */}
            <div className="hidden lg:flex absolute -left-8 -bottom-8 z-20 items-end gap-3 group">
              <div className="relative w-44 h-64 shrink-0 drop-shadow-2xl">
                <img 
                  src="/images/mascot/nexi_presenting_trans.png" 
                  alt="Nexi Presenting NexusHR" 
                  className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] select-none pointer-events-none transition-transform group-hover:scale-105 duration-300"
                />
              </div>
              <div className="mb-6 max-w-xs p-4 rounded-2xl border border-white/15 bg-[#0a0f1d]/90 backdrop-blur-xl shadow-2xl text-left space-y-1.5 animate-in fade-in duration-500">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300">
                  <Sparkles className="h-3 w-3" /> Autonomous AI Operations
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  &ldquo;I reconcile shift attendance, calculate tax withholding, and manage sprint task transitions automatically.&rdquo;
                </p>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 pt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live in 100+ Workspaces
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Metrics Banner */}
      <section className="relative z-10 py-12 border-y border-white/[0.08] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {metrics.map((m, i) => (
              <div key={i} className="text-center sm:text-left space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">{m.value}</div>
                <div className="text-xs font-semibold text-slate-300">{m.label}</div>
                <div className="text-[11px] text-slate-500">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Bento Grid */}
      <section id="capabilities" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">End-to-End Suite</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for performance and precision.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every tool required to manage people, projects, and payroll without disjointed third-party plugins.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((c, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all space-y-3 text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {c.icon}
                </div>
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 🌟 Dedicated Meet Nexi Feature Showcase Section */}
      <section id="nexi" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Official 3D AI Companion</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-indigo-300 to-purple-400">Nexi</span> — The Face of NexusHR.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              More than a chatbot. Nexi is an intelligent autonomous ally living inside your company workspace, helping team members with leave requests, geofencing, sprint tickets, and real-time policy guidance.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {(["policy", "security", "ideas", "culture", "support"] as const).map((key) => {
              const feat = mascotFeatures[key];
              const isActive = activeMascotTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveMascotTab(key)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive 
                      ? "bg-gradient-to-r from-teal-500/20 to-indigo-500/25 border-teal-500/50 text-white shadow-lg shadow-teal-500/15" 
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? "bg-teal-400 animate-pulse" : "bg-slate-600"}`} />
                  {feat.name}
                </button>
              );
            })}
          </div>

          {/* Dynamic Showcase Card */}
          <div className="max-w-5xl mx-auto rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] via-[#090e1c] to-[#060913] p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left Column: Mascot Render Stage with 3D Sphere Glow */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
                
                {/* 3D Volumetric Sphere Backing */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-500/25 via-indigo-500/20 to-purple-600/25 blur-2xl animate-pulse" />
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-white/20 bg-gradient-to-b from-white/10 to-transparent shadow-inner flex items-end justify-center overflow-hidden">
                    <img 
                      src={mascotFeatures[activeMascotTab].image}
                      alt={mascotFeatures[activeMascotTab].name}
                      className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] select-none pointer-events-none transition-all duration-300 scale-105"
                    />
                  </div>
                </div>

                {/* Role Pill */}
                <div className="mt-3 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-teal-300 font-medium">
                  {mascotFeatures[activeMascotTab].role}
                </div>
              </div>

              {/* Right Column: Interactive Details & Query Simulation */}
              <div className="lg:col-span-7 space-y-6 text-left">
                
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {mascotFeatures[activeMascotTab].badge}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {mascotFeatures[activeMascotTab].headline}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {mascotFeatures[activeMascotTab].description}
                  </p>
                </div>

                {/* Live Chat Simulation Bubble */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-teal-400" /> Live Interaction Simulation
                  </div>
                  
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="bg-teal-600/30 border border-teal-500/40 text-teal-100 rounded-xl rounded-tr-none px-3.5 py-2 text-xs max-w-sm">
                      {mascotFeatures[activeMascotTab].prompt}
                    </div>
                  </div>

                  {/* Nexi Response */}
                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-full overflow-hidden border border-white/20 bg-indigo-900/40 shrink-0">
                      <img src="/images/mascot/nexi_welcoming_avatar.png" alt="Nexi" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                    <div className="bg-white/10 border border-white/10 text-white rounded-xl rounded-tl-none px-3.5 py-2 text-xs max-w-md shadow-xs">
                      {mascotFeatures[activeMascotTab].response}
                    </div>
                  </div>
                </div>

                {/* Capabilities Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {mascotFeatures[activeMascotTab].tags.map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.03] border border-white/10 text-slate-300">
                      ✓ {tag}
                    </span>
                  ))}
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Security & Reliability Section */}
      <section id="security" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto text-left space-y-12">
          
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise-grade compliance & isolation.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Designed from day one to protect your confidential payroll, biometric records, and proprietary project data.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Lock className="h-4 w-4 text-teal-400" /> Multi-Tenant Isolation
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated company scopes with isolated JWT sessions and database-enforced row level security.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="h-4 w-4 text-indigo-400" /> Device Fingerprinting
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Single-device hardware token binding prevents unauthorized access and spoofed remote check-ins.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Zap className="h-4 w-4 text-purple-400" /> Instant Audit Logging
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every permission change, approval, and payroll adjustment is signed and immutably recorded.
              </p>
            </div>
          </div>

          {/* Celebratory Nexi CTA Banner */}
          <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-indigo-950/30 to-purple-950/20 p-8 sm:p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-[90px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              
              <div className="space-y-3 text-center md:text-left max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                  <PartyPopper className="h-3.5 w-3.5 text-teal-400" />
                  <span>Start Your 14-Day Free Trial</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Ready to elevate your workforce operations?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join forward-thinking engineering companies using NexusHR and Nexi to automate attendance, payroll runs, and sprint commitments.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link href="/register">
                    <Button className="h-11 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/30">
                      Register Organization <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="h-11 px-6 rounded-xl border-white/20 text-white hover:bg-white/10 text-xs font-semibold">
                      Sign In to Workspace
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Celebratory 3D Mascot */}
              <div className="shrink-0 relative w-44 h-56 sm:w-52 sm:h-64 flex items-end justify-center">
                <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-2xl" />
                <img 
                  src="/images/mascot/nexi_celebration_trans.png" 
                  alt="Nexi Celebration" 
                  className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] select-none pointer-events-none transition-transform hover:scale-105 duration-300"
                />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-12 bg-[#050810] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-xs shrink-0 overflow-hidden">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain rounded-full" />
              </div>
              <span className="font-bold text-white tracking-tight">NexusHR Enterprise</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">© 2026 NexusHR</span>
            </div>

            <div className="flex items-center gap-6 font-medium">
              <a href="#nexi" className="text-teal-300 hover:text-teal-200 transition-colors">Nexi AI</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>

          </div>
        </div>
      </footer>

      {/* Floating Interactive Live Chatbot */}
      <HRChatbot />

    </div>
  );
}
