"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { 
  Building2, Users, Clock, Calendar, CreditCard, ShieldCheck, 
  MapPin, TrendingUp, CheckCircle, ArrowRight, GitBranch, 
  Kanban, CheckSquare, UserPlus, Menu, X, ChevronRight, FileText,
  Sparkles, Mic, Zap, Layers, Lock, Shield, CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const router = useRouter();

  const handleCompanyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyCode.trim()) {
      router.push(`/${companyCode.trim().toUpperCase()}`);
    }
  };

  const coreFeatures = [
    {
      icon: <Kanban className="h-6 w-6 text-indigo-600" />,
      bg: "bg-indigo-50 border-indigo-100",
      title: "PMS & Sprint Kanban Board",
      badge: "Project Management",
      description: "Sprint board with ambient column tints, top accent borders, backlog filters, and integrated assignee clusters."
    },
    {
      icon: <GitBranch className="h-6 w-6 text-purple-600" />,
      bg: "bg-purple-50 border-purple-100",
      title: "GitHub PMS Automation",
      badge: "Developer Sync",
      description: "Automated webhook sync. Pushing branch names with ticket IDs (e.g., TSK26070010) auto-shifts status to In Progress."
    },
    {
      icon: <CheckSquare className="h-6 w-6 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-100",
      title: "Today's Task & EOD Reports",
      badge: "Employee Productivity",
      description: "Daily ticket picking, 15m–8h estimation, 30-min shift unlock timers, and read-only manager review dashboards."
    },
    {
      icon: <MapPin className="h-6 w-6 text-rose-600" />,
      bg: "bg-rose-50 border-rose-100",
      title: "Geo-Fenced GPS Attendance",
      badge: "Location Intelligence",
      description: "Real-time GPS radius verification, live office boundary maps, WFH/Office mode toggles, and shift log tracking."
    },
    {
      icon: <Mic className="h-6 w-6 text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      title: "AI Voice Executive Briefings",
      badge: "Smart AI Voice",
      description: "Interactive voice summaries (Amitabh Bachchan KBC Baritone & Indian female voices) with ambient Web Audio synth background."
    },
    {
      icon: <UserPlus className="h-6 w-6 text-sky-600" />,
      bg: "bg-sky-50 border-sky-100",
      title: "Recruitment & Candidate Inbox",
      badge: "Talent Acquisition",
      description: "End-to-end recruitment pipelines, job postings, candidate evaluation inboxes, and applicant tracking."
    },
    {
      icon: <CreditCard className="h-6 w-6 text-blue-600" />,
      bg: "bg-blue-50 border-blue-100",
      title: "Automated Payroll & Expenses",
      badge: "Financial Operations",
      description: "Automated salary calculation, payslip generation, tax deductions, and employee expense claim reimbursements."
    },
    {
      icon: <Calendar className="h-6 w-6 text-teal-600" />,
      bg: "bg-teal-50 border-teal-100",
      title: "Leaves & Overtime Tracking",
      badge: "Time Off",
      description: "Real-time leave balance tracking, multi-level approval workflows, and automated shift overtime tracking."
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-600" />,
      bg: "bg-indigo-50 border-indigo-100",
      title: "Employee Directory & Resignations",
      badge: "HR Operations",
      description: "Complete lifecycle management, department structures, designation hierarchies, and offboarding workflows."
    }
  ];

  const steps = [
    { number: "01", title: "Register Company", description: "Create your organization profile with GST, company code, and office GPS coordinates." },
    { number: "02", title: "Connect GitHub Repos", description: "Link PMS projects to GitHub repositories for real-time branch status parsing." },
    { number: "03", title: "Onboard Team", description: "Assign role-based access for managers, HR admins, and team members." },
    { number: "04", title: "Automate & Track", description: "Monitor daily EOD task plans, geo-verified attendance, and monthly payroll." }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Light Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-50/60 rounded-full blur-[140px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  Nexus<span className="text-indigo-600">HR</span>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full">PRO</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Enterprise HR & PMS Suite</span>
              </div>
            </Link>
            
            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
              <a href="#github-integration" className="hover:text-indigo-600 transition-colors">GitHub Sync</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">Workflow</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-5 text-xs font-bold">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 text-xs font-bold shadow-lg shadow-indigo-600/20">
                  Register Company
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-6 space-y-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Features</a>
            <a href="#github-integration" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">GitHub Sync</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 font-medium">Workflow</a>
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <Link href="/login" className="block w-full">
                <Button variant="outline" className="w-full border-slate-300 text-slate-700">Sign In</Button>
              </Link>
              <Link href="/register" className="block w-full">
                <Button className="w-full bg-indigo-600 text-white">Register Company</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-20 lg:pt-44 lg:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Content */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200/80 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Enterprise HR & Project Management Platform
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Unified Platform for <span className="text-indigo-600">HR & Projects</span>
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                Connect your organization with Geo-Fenced GPS attendance, GitHub-integrated PMS sprint boards, 
                employee Today Task & EOD reports, automated payroll, and AI voice executive briefings.
              </p>

              {/* Direct Company Code Access */}
              <form onSubmit={handleCompanyLogin} className="flex flex-col sm:flex-row gap-3 max-w-lg bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xl shadow-slate-200/60">
                <div className="relative flex-1">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="Company Code (e.g. ACME)"
                    className="w-full pl-10 pr-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 text-xs font-bold uppercase tracking-wider focus:outline-none"
                  />
                </div>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-6 py-3 shadow-md shadow-indigo-600/20">
                  Enter Portal
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-600 pt-2">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Geo-Fence Attendance</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> GitHub Webhook Sync</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Today Task EOD Reports</span>
              </div>
            </div>

            {/* Hero Mock Preview Card */}
            <div className="lg:col-span-5 relative group">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl shadow-slate-200/80 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      NX
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">NexusHR Enterprise</h4>
                      <p className="text-[10px] text-slate-400">Live Operations Portal</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                    Active System
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Present Today</span>
                    <p className="text-2xl font-black text-slate-900">148 / 152</p>
                    <span className="text-[9px] text-emerald-600 font-semibold">97.3% Geo-Verified</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">EOD Reports</span>
                    <p className="text-2xl font-black text-indigo-600">42 Submitted</p>
                    <span className="text-[9px] text-indigo-500 font-semibold">Shift End Active</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-purple-600" />
                      GitHub Webhook Sync
                    </span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-mono">TSK26070010</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">feature/TSK26070010-auth</span>
                    <p className="text-xs font-bold text-slate-800">Implement OAuth Backend Flows</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="relative z-10 py-24 bg-slate-50/70 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Complete Feature Suite</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Engineered for Modern Enterprise Teams
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore all features implemented inside NexusHR — built to integrate project management, 
              developer GitHub automation, attendance tracking, payroll, and HR operations into one portal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feat, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 hover:border-indigo-400 p-6 rounded-3xl space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl border ${feat.bg} group-hover:scale-105 transition-transform`}>
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full uppercase">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Integration */}
      <section id="github-integration" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-3xl p-8 sm:p-12 shadow-sm grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 border border-purple-200 text-purple-800 rounded-full text-xs font-bold uppercase">
                <GitBranch className="h-3.5 w-3.5 text-purple-600" />
                Developer Webhook Sync
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Automatic GitHub Branch to PMS Ticket Update
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect PMS projects to GitHub repositories. Pushing a branch containing a ticket number 
                (e.g., <code className="text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded font-mono">feature/TSK26070010-auth</code>) 
                automatically shifts ticket status on your sprint board to <strong className="text-amber-700">In Progress</strong>.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 font-mono text-xs text-slate-700 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-slate-400 text-[11px]">
                <span>github-webhook.json</span>
                <span className="text-emerald-600 font-bold">200 OK</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p><span className="text-purple-600 font-bold">"ref"</span>: <span className="text-emerald-700 font-semibold">"refs/heads/feature/TSK26070010-auth"</span>,</p>
                <p className="text-amber-700 font-bold pt-2 border-t border-slate-100">
                  ⚡ Auto-shifted TSK26070010 status → "IN_PROGRESS"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 py-24 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Simple Onboarding</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Get Started in 4 Steps</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
                <span className="text-4xl font-black text-indigo-200">{st.number}</span>
                <h3 className="text-lg font-bold text-slate-900">{st.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-12 bg-white text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">
              NX
            </div>
            <span className="text-sm font-bold text-slate-900">NexusHR Enterprise System</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 NexusHR. All rights reserved.</p>
          <div className="flex gap-4 text-xs font-semibold text-slate-600">
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
            <Link href="/register" className="hover:text-slate-900">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
