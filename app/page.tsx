"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { 
  Building2, Users, Clock, Calendar, CreditCard, ShieldCheck, 
  MapPin, TrendingUp, CheckCircle, ArrowRight, GitBranch, 
  Kanban, CheckSquare, UserPlus, Menu, X, ChevronRight, FileText,
  Sparkles, Mic, Zap, Layers, Lock, Shield, CheckCircle2
} from "lucide-react";

function TiltCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 });

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

function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full mix-blend-multiply pointer-events-none ${className}`}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.08, 1],
      }}
      transition={{
        duration: 8 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

function FloatingParticles() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]>([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.2,
    }));
    setParticles(p);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -60, 0],
            x: [0, 30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }
};

const FeatureCard = ({ icon, bg, title, badge, description, index }: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  badge: string;
  description: string;
  index: number;
}) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-100px" }}
    variants={itemVariants}
    whileHover={{ y: -6, scale: 1.02 }}
    style={{ transformStyle: "preserve-3d", perspective: 800 }}
    className="bg-white/70 border border-slate-200/80 hover:border-indigo-400/50 p-6 rounded-3xl space-y-4 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group backdrop-blur-sm"
  >
    <div className="flex items-center justify-between">
      <motion.div
        className={`p-3 rounded-2xl border ${bg} group-hover:scale-110 transition-transform duration-300`}
        whileHover={{ scale: 1.1, rotate: 3 }}
        transition={{ duration: 0.3 }}
      >
        {icon}
      </motion.div>
      <span className="text-[10px] font-bold bg-slate-100/80 border border-slate-200/80 text-slate-600 px-2.5 py-1 rounded-full uppercase backdrop-blur-sm">
        {badge}
      </span>
    </div>
    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h3>
    <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
  </motion.div>
);

const StepCard = ({ number, title, description, index }: {
  number: string;
  title: string;
  description: string;
  index: number;
}) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-100px" }}
    variants={itemVariants}
    whileHover={{ y: -6, scale: 1.02 }}
    style={{ transformStyle: "preserve-3d", perspective: 800 }}
    className="bg-white/70 border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-sm backdrop-blur-sm relative overflow-hidden group"
  >
    <motion.span
      className="text-4xl font-black text-indigo-200/80 block"
      whileHover={{ scale: 1.15, x: 5 }}
      transition={{ duration: 0.3 }}
    >
      {number}
    </motion.span>
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 0 }}
      whileHover={{ scaleX: 1 }}
    />
  </motion.div>
);

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroParallaxY2 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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
      description: "Interactive voice summaries with natural deep-baritone and Indian female voices, plus an ambient Web Audio synth background."
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      <FloatingParticles />

      {/* 3D Floating Shapes */}
      <FloatingShape className="w-72 h-72 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 top-[10%] left-[-5%] blur-3xl" delay={0} />
      <FloatingShape className="w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 top-[40%] right-[-8%] blur-3xl" delay={2} />
      <FloatingShape className="w-64 h-64 bg-gradient-to-br from-blue-200/25 to-cyan-200/25 bottom-[15%] left-[20%] blur-3xl" delay={4} />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 rounded-full bg-[#03081c] flex items-center justify-center p-1.5 shadow-sm border border-[#03081c] transition-transform group-hover:scale-105 shrink-0">
                <img 
                  src="/logo.png" 
                  alt="NexusHR Logo" 
                  className="h-full w-full object-contain scale-110" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Nexus<span className="text-indigo-600">HR</span>
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
        <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 px-4 py-6 space-y-4 overflow-hidden"
          >
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
          </motion.div>
        )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 pt-36 pb-20 lg:pt-44 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Content */}
            <motion.div
              style={{ y: heroParallaxY2, opacity: heroOpacity }}
              className="lg:col-span-7 space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200/80 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider"
              >
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Enterprise HR & Project Management Platform
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]"
              >
                Unified Platform for <span className="text-indigo-600">HR & Projects</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                className="text-lg text-slate-600 max-w-2xl leading-relaxed"
              >
                NexusHR is a modern HR management system that unifies attendance tracking, leave management,
                payroll processing, expense tracking, and AI-powered project management into a single platform.  Connect your organization with geo-fenced GPS attendance, GitHub-integrated PMS sprint boards,
                employee task and EOD reports, automated payroll, and AI voice executive briefings — all designed
                for modern enterprise teams.
              </motion.p>

              {/* Direct Company Code Access */}
              <motion.form
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                onSubmit={handleCompanyLogin}
                className="flex flex-col sm:flex-row gap-3 max-w-lg bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xl shadow-slate-200/60"
              >
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
              </motion.form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-600 pt-2"
              >
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Geo-Fence Attendance</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> GitHub Webhook Sync</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Today Task EOD Reports</span>
              </motion.div>
            </motion.div>

            {/* Hero Mock Preview Card - 3D Tilt */}
            <motion.div
              style={{ y: heroParallaxY }}
              className="lg:col-span-5 relative group"
              initial={{ opacity: 0, x: 50, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-pink-400/20 rounded-3xl blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-700" />
              
              <TiltCard className="relative bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-2xl shadow-slate-200/80 space-y-5 backdrop-blur-sm group-hover:shadow-indigo-500/20 transition-shadow duration-500" style={{ transformStyle: "preserve-3d" }}>
                <motion.div
                  style={{ transform: "translateZ(40px)" }}
                  className="flex items-center justify-between border-b border-slate-100 pb-4"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/30"
                    >
                      NX
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">NexusHR Enterprise</h4>
                      <p className="text-[10px] text-slate-400">Live Operations Portal</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                    Active System
                  </span>
                </motion.div>

                <motion.div
                  style={{ transform: "translateZ(60px)" }}
                  className="grid grid-cols-2 gap-3"
                >
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="bg-white border border-slate-200/80 p-3.5 rounded-2xl space-y-1 shadow-sm"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Present Today</span>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                      className="text-2xl font-black text-slate-900"
                    >
                      148 / 152
                    </motion.p>
                    <span className="text-[9px] text-emerald-600 font-semibold">97.3% Geo-Verified</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="bg-white border border-slate-200/80 p-3.5 rounded-2xl space-y-1 shadow-sm"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase">EOD Reports</span>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                      className="text-2xl font-black text-indigo-600"
                    >
                      42 Submitted
                    </motion.p>
                    <span className="text-[9px] text-indigo-500 font-semibold">Shift End Active</span>
                  </motion.div>
                </motion.div>

                <motion.div
                  style={{ transform: "translateZ(80px)" }}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-purple-600" />
                      GitHub Webhook Sync
                    </span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-mono">TSK26070010</span>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">feature/TSK26070010-auth</span>
                    <p className="text-xs font-bold text-slate-800">Implement OAuth Backend Flows</p>
                  </div>
                </motion.div>
              </TiltCard>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="relative z-10 py-24 bg-slate-50/70 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center max-w-3xl mx-auto space-y-4 mb-16"
          >
            <motion.span variants={itemVariants} className="text-xs font-bold uppercase tracking-widest text-indigo-600">Complete Feature Suite</motion.span>
            <motion.h2 variants={itemVariants} className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Engineered for Modern Enterprise Teams
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore all features implemented inside NexusHR — built to integrate project management, 
              developer GitHub automation, attendance tracking, payroll, and HR operations into one portal.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feat, idx) => (
              <FeatureCard 
                key={idx} 
                icon={feat.icon} 
                bg={feat.bg} 
                title={feat.title} 
                badge={feat.badge} 
                description={feat.description} 
                index={idx}
              />
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Integration */}
      <section id="github-integration" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border border-indigo-100/80 rounded-3xl p-8 sm:p-12 shadow-sm grid lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={itemVariants} className="space-y-6">
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
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="bg-white/90 border border-slate-200/80 rounded-2xl p-5 font-mono text-xs text-slate-700 space-y-3 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-slate-400 text-[11px]">
                <span>github-webhook.json</span>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-emerald-600 font-bold"
                >
                  200 OK
                </motion.span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p><span className="text-purple-600 font-bold">"ref"</span>: <span className="text-emerald-700 font-semibold">"refs/heads/feature/TSK26070010-auth"</span>,</p>
                <motion.p
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-amber-700 font-bold pt-2 border-t border-slate-100"
                >
                  ⚡ Auto-shifted TSK26070010 status → "IN_PROGRESS"
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 py-24 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center max-w-2xl mx-auto space-y-4 mb-16"
          >
            <motion.span variants={itemVariants} className="text-xs font-bold uppercase tracking-widest text-indigo-600">Simple Onboarding</motion.span>
            <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Get Started in 4 Steps</motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <StepCard 
                key={idx} 
                number={step.number} 
                title={step.title} 
                description={step.description} 
                index={idx}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why NexusHR — Rich content section for SEO */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="space-y-6"
          >
            <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why Choose NexusHR as Your HR Management System?
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-600 text-base leading-relaxed">
              Managing human resources across distributed teams requires more than spreadsheets and scattered tools.
              NexusHR is an all-in-one HR management system built for modern organizations that need real-time visibility
              into attendance, leave balances, payroll, and project delivery. Unlike traditional HR software, NexusHR
              combines enterprise-grade HR operations with an AI-powered project management system, giving managers a
              single source of truth for both people and productivity.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">Geo-Fenced Attendance You Can Trust</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Traditional attendance systems rely on manual clock-ins that are easy to fake. NexusHR uses real-time
                GPS verification to confirm every employee check-in happens within your defined office radius. Managers
                can see live attendance dashboards, office boundary maps, and work-from-home vs office mode toggles — all
                updated in real time through WebSocket-powered sync. The system also supports automatic punch-in when an
                employee enters the geo-fenced zone, eliminating forgotten clock-ins entirely.
              </p>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">GitHub-Integrated Project Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                NexusHR bridges the gap between engineering and HR with its GitHub-integrated project management system.
                When a developer pushes a branch containing a ticket ID — for example <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">feature/TSK26070010-auth</code> —
                the sprint board automatically updates the task status to In Progress. This eliminates manual status
                updates, keeps sprint boards accurate, and gives project managers real-time visibility into development
                progress without interrupting the engineering workflow.
              </p>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">Automated Payroll and Expense Tracking</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Processing payroll manually is time-consuming and error-prone. NexusHR automates salary calculations
                based on attendance data, overtime hours, and leave records. The system generates payslips with tax
                deductions, tracks employee expense claims, and maintains a complete financial audit trail. HR teams
                can run payroll for the entire organization in minutes instead of days, with built-in compliance checks
                and approval workflows that prevent costly mistakes before they happen.
              </p>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">AI-Powered Insights and Voice Briefings</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                NexusHR goes beyond traditional HR software with its built-in AI assistant. Managers can request
                voice-executive briefings that summarize team attendance, pending leave requests, active projects, and
                budget utilization — all delivered through natural language voice synthesis. The AI project management
                agent also helps teams break down complex tasks, estimate story points, and identify blockers before
                they impact sprint timelines. This is the future of human resources management, powered by advanced
                language models and real-time organizational data.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900">Built for Security and Compliance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Enterprise HR systems handle sensitive employee data including salary information, personal identification,
              and location history. NexusHR is built with security-first principles: JWT-based authentication, role-based
              access control for admins, managers, and employees, encrypted data at rest, and QR-code device linking that
              ensures only verified devices can access the platform. Every attendance check-in is geo-verified and
              timestamped, creating an auditable trail that satisfies regulatory compliance requirements across industries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative z-10 border-t border-slate-200 py-16 bg-white text-slate-600"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-[#03081c] flex items-center justify-center p-1.5 shadow-sm border border-[#03081c] shrink-0">
                  <img 
                    src="/logo.png" 
                    alt="NexusHR Logo" 
                    className="h-full w-full object-contain scale-110" 
                  />
                </div>
                <span className="text-sm font-bold text-slate-900">NexusHR</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Modern HR management system for enterprise teams. Attendance, payroll, projects, and AI — unified.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-indigo-600 transition-colors">Features</a></li>
                <li><a href="#github-integration" className="hover:text-indigo-600 transition-colors">GitHub Integration</a></li>
                <li><a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a></li>
                <li><Link href="/login" className="hover:text-indigo-600 transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-indigo-600 transition-colors">Register Company</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com/Anirudh3434" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">GitHub Repository</a></li>
                <li><a href="https://github.com/Anirudh3434/nexus-hr-websocket" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">WebSocket Server</a></li>
                <li><a href="https://github.com/Anirudh3434?tab=repositories" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">All Repositories</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-slate-400">Privacy Policy</span></li>
                <li><span className="text-slate-400">Terms of Service</span></li>
                <li><span className="text-slate-400">Cookie Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">© 2026 NexusHR. All rights reserved. Built by Anirudh Bhardwaj.</p>
            <div className="flex gap-4 text-xs font-semibold text-slate-600">
              <Link href="/login" className="hover:text-slate-900">Sign In</Link>
              <Link href="/register" className="hover:text-slate-900">Register</Link>
              <a href="https://github.com/Anirudh3434" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">GitHub</a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
