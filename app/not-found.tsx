"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  ArrowLeft,
  Compass,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Clock,
  BookOpen,
  HelpCircle,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const { user } = useAuth();

  const homeHref = user
    ? user.role === "super_admin"
      ? "/super-admin"
      : user.isCandidate
      ? "/candidate/dashboard"
      : "/dashboard"
    : "/login";

  const quickLinks = [
    {
      title: "Workspace Dashboard",
      desc: "Live metrics, team feed & activity",
      href: homeHref,
      icon: LayoutDashboard,
      color: "from-teal-500/10 to-emerald-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    },
    {
      title: "Project Boards",
      desc: "Sprints, kanban & task backlog",
      href: "/projects",
      icon: FolderKanban,
      color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      title: "Attendance & Time",
      desc: "Geo-fencing, shifts & punch records",
      href: "/attendance",
      icon: Clock,
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      title: "Knowledge Base",
      desc: "HR policies, handbook & perks",
      href: "/hr-knowledge-base",
      icon: BookOpen,
      color: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-neutral-50 dark:bg-[#070b14] overflow-hidden select-none">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');
        .font-cursive {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* Ambient background glow orbs matching MCP container theme */}
      <div className="absolute -top-32 -left-28 w-96 h-96 bg-primary/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-teal-500/15 dark:bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle background dot grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,118,110,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Central Glassmorphic Card */}
      <div className="relative w-full max-w-2xl rounded-[28px] sm:rounded-[36px] border border-white/70 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/80 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-950/85 backdrop-blur-2xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-10 z-10">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200/60 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 p-1.5 shadow-sm border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="NexusHR Logo"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Nexus<span className="text-primary">HR</span>
              </span>
              <span className="text-[11px] text-neutral-400 block -mt-0.5">Enterprise Portal</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Error 404</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center py-8 sm:py-10">
          {/* Animated 404 Display */}
          <div className="relative inline-block mb-4">
            <div className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-400 dark:from-white dark:via-neutral-200 dark:to-neutral-600 drop-shadow-sm select-none">
              404
            </div>
            <div className="absolute -top-2 -right-4 sm:-top-3 sm:-right-6 flex items-center justify-center h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-primary to-teal-700 text-white shadow-lg shadow-primary/30 border border-white/40 dark:border-white/20 transform rotate-12 animate-pulse">
              <Compass className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
            Page{" "}
            <span className="font-cursive text-3xl sm:text-4xl md:text-5xl font-bold text-primary tracking-normal">
              not found
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-lg mx-auto leading-relaxed">
            Looks like you've wandered into an uncharted route. The page or file you are looking for has been moved, renamed, or is unavailable in this environment.
          </p>

          {/* Action CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all"
            >
              <Home className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>

            <button
              onClick={() => router.back()}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300/80 dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/70 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-sm shadow-xs active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Quick Nav Grid */}
        <div className="pt-6 border-t border-neutral-200/60 dark:border-neutral-800/80">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Popular destinations</span>
            </div>
            <span className="text-[11px] text-neutral-400 font-medium">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-center gap-3 p-3 rounded-2xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 hover:bg-white dark:hover:bg-neutral-800 hover:border-primary/40 dark:hover:border-primary/40 transition-all shadow-xs hover:shadow-sm"
                >
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border bg-gradient-to-br ${item.color} group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Help Note */}
        <div className="mt-6 pt-4 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Need assistance? Check the <Link href="/hr-knowledge-base" className="text-primary hover:underline font-medium">Knowledge Base</Link></span>
          </div>
          <span className="font-mono text-[10px] text-neutral-400">NEXUS-HR-ROUTER</span>
        </div>
      </div>
    </div>
  );
}
