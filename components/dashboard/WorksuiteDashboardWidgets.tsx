"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Cake, 
  Palmtree, 
  Calendar as CalendarIcon, 
  FolderKanban, 
  CheckSquare, 
  Search, 
  Clock, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Home,
  Loader2,
  ListFilter,
  Sparkles,
  PartyPopper,
  ExternalLink,
  ChevronDown,
  Ticket,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Building,
  Flag,
  Flame,
  Award,
  CircleDot
} from "lucide-react";

// ====================================================
// 1. TOP HEADER WITH SHIFT CONTROL & GREETING
// ====================================================
interface WorksuiteHeaderProps {
  userName: string;
  activeShift: { start: Date; mode: string } | null;
  elapsedTime: string;
  isProcessing: boolean;
  workMode: 'office' | 'wfh';
  setWorkMode: (mode: 'office' | 'wfh') => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onLogout: () => void;
}

export const WorksuiteHeader = ({
  userName,
  activeShift,
  elapsedTime,
  isProcessing,
  workMode,
  setWorkMode,
  onCheckIn,
  onCheckOut,
}: WorksuiteHeaderProps) => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 12) setGreeting("Good morning");
      else if (hours < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const dayStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      setCurrentTime(timeStr);
      setCurrentDay(dayStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const firstName = userName ? userName.split(" ")[0] : "Employee";

  return (
    <div className="relative rounded-3xl bg-gradient-to-r from-blue-600/[0.07] via-indigo-500/[0.04] to-violet-600/[0.08] dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-violet-950/30 border border-blue-200/50 dark:border-blue-900/30 p-5 sm:p-6 backdrop-blur-md shadow-xs z-20 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left: Dynamic Greeting */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 font-bold tracking-wide uppercase text-[10px]">
              NexusHR Workspace
            </span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-gray-500 dark:text-gray-400 font-medium">{currentDay}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{greeting}, {firstName}</span>
            <span className="animate-pulse">✨</span>
          </h1>
        </div>

        {/* Right: Real-time Shift & Clock In Capsule */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 p-1.5 pl-4 bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm backdrop-blur-sm relative">
            <div className="text-right flex flex-col pr-2">
              <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {activeShift ? elapsedTime : currentTime || "09:00 AM"}
              </span>
              <span className="text-[10px] font-semibold text-gray-400 flex items-center justify-end gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                {activeShift ? "On Clock" : "Offline"}
              </span>
            </div>

            {activeShift ? (
              <button
                onClick={onCheckOut}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                <span>Clock Out</span>
              </button>
            ) : (
              <div className="relative">
                <div className="flex items-center rounded-xl overflow-hidden shadow-md shadow-blue-500/20">
                  <button
                    onClick={onCheckIn}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all active:scale-95"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                    <span>Clock In</span>
                  </button>
                  <button
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className="flex items-center gap-1 px-2.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs border-l border-indigo-500/40 transition-colors"
                    title={`Work Mode: ${workMode.toUpperCase()}`}
                  >
                    {workMode === 'office' ? <Briefcase size={13} /> : <Home size={13} />}
                    <ChevronDown size={11} className={`transition-transform duration-200 ${showModeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showModeDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      Work Mode
                    </div>
                    <button
                      onClick={() => { setWorkMode('office'); setShowModeDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${workMode === 'office' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Briefcase size={14} /> Office Mode
                      </span>
                      {workMode === 'office' && <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                    <button
                      onClick={() => { setWorkMode('wfh'); setShowModeDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${workMode === 'wfh' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Home size={14} /> Remote (WFH)
                      </span>
                      {workMode === 'wfh' && <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};


// ====================================================
// 2. OVERVIEW KPI METRIC TILES
// ====================================================
interface QuickMetricsBarProps {
  tasksPending: number;
  tasksOverdue: number;
  projectsCount: number;
  awayCount: number;
  nextBirthdayText?: string;
}

export const QuickMetricsBar = ({
  tasksPending = 0,
  tasksOverdue = 0,
  projectsCount = 0,
  awayCount = 0,
  nextBirthdayText = "Ayush (25 Aug)"
}: QuickMetricsBarProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Pending Tasks */}
      <Link href="/tasks" className="group p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Tasks</span>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition-transform">
            <CheckSquare size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-black text-gray-900 dark:text-white">{tasksPending}</span>
          <span className="text-xs font-bold text-gray-400">Pending</span>
          {tasksOverdue > 0 && (
            <span className="ml-auto text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
              {tasksOverdue} overdue
            </span>
          )}
        </div>
      </Link>

      {/* 2. Projects In Track */}
      <Link href="/my-projects" className="group p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Projects</span>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 group-hover:scale-110 transition-transform">
            <FolderKanban size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-black text-gray-900 dark:text-white">{projectsCount}</span>
          <span className="text-xs font-bold text-gray-400">In Progress</span>
          <span className="ml-auto text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
            100% On Track
          </span>
        </div>
      </Link>

      {/* 3. Team Availability */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team Away</span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            <Palmtree size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-black text-gray-900 dark:text-white">{awayCount}</span>
          <span className="text-xs font-bold text-gray-400">On Leave Today</span>
          <span className="ml-auto text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
            Full Day
          </span>
        </div>
      </div>

      {/* 4. Upcoming Celebration */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Celebration</span>
          <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600">
            <Cake size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{nextBirthdayText}</span>
          <span className="ml-auto text-[10px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/50 px-2 py-0.5 rounded-full">
            Upcoming
          </span>
        </div>
      </div>

    </div>
  );
};


// ====================================================
// 3. EXECUTIVE PROFILE CARD
// ====================================================
interface ExecutiveProfileCardProps {
  name: string;
  designation: string;
  employeeId: string;
  department: string;
  avatar?: string;
  openTasksCount: number;
  projectsCount: number;
  workShift?: { name?: string; startTime?: string; endTime?: string } | null;
}

export const ExecutiveProfileCard = ({
  name,
  designation,
  employeeId,
  department,
  avatar,
  openTasksCount = 0,
  projectsCount = 0,
  workShift
}: ExecutiveProfileCardProps) => {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden">
      
      <div className="flex items-center gap-4">
        {/* Glow Ring Avatar */}
        <div className="relative shrink-0">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 shadow-md">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-900"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl border-2 border-white dark:border-gray-900">
                {name?.charAt(0) || "E"}
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
        </div>

        {/* Identity Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">
            {name}
          </h2>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {designation}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[10px] font-bold">
              ID: #{employeeId || "—"}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              {department || "Engineering"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Shift & Task Split */}
      <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Assigned Tasks</span>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{openTasksCount}</p>
        </div>
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Projects</span>
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{projectsCount}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Clock size={13} className="text-gray-400" />
          <span>Shift: {workShift?.startTime || "09:00 AM"} – {workShift?.endTime || "06:00 PM"}</span>
        </span>
        <Link href="/profile" className="text-blue-600 hover:underline font-bold text-[11px] flex items-center gap-1">
          Profile <ArrowUpRight size={12} />
        </Link>
      </div>

    </div>
  );
};


// ====================================================
// 4. TEAM RADAR (TABS: WHO'S AWAY & MILESTONES)
// ====================================================
interface TeamRadarProps {
  onLeave?: any[];
  joinings?: any[];
  anniversaries?: any[];
}

export const TeamPresenceHub = ({
  onLeave = [],
  joinings = [],
  anniversaries = [],
}: TeamRadarProps) => {
  const [tab, setTab] = useState<'leave' | 'milestones'>('leave');

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm flex flex-col justify-between min-h-[340px]">
      
      <div>
        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('leave')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'leave'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Palmtree size={13} />
              <span>Who's Away ({onLeave.length})</span>
            </button>

            <button
              onClick={() => setTab('milestones')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'milestones'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <PartyPopper size={13} />
              <span>Milestones ({joinings.length + anniversaries.length})</span>
            </button>
          </div>
        </div>

        {/* Content with Scrollable List */}
        <div className="max-h-[220px] overflow-y-auto pr-1">
          {tab === 'leave' ? (
            onLeave.length > 0 ? (
              <div className="space-y-2.5">
                {onLeave.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {item.name?.charAt(0) || "C"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-[11px] text-gray-400">{item.designation || item.department}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      {item.leaveType || 'Leave'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400">
                <Palmtree size={28} className="mb-2 text-gray-300 dark:text-gray-600" />
                <p className="font-semibold">Everyone is present today!</p>
              </div>
            )
          ) : (
            (joinings.length > 0 || anniversaries.length > 0) ? (
              <div className="space-y-2.5">
                {joinings.map((j, idx) => (
                  <div key={`j-${idx}`} className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        {j.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{j.name}</p>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">Joined Today 🎉</p>
                      </div>
                    </div>
                  </div>
                ))}
                {anniversaries.map((a, idx) => (
                  <div key={`a-${idx}`} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                        {a.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{a.name}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{a.years} Year Anniversary 🏆</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400">
                <Award size={28} className="mb-2 text-gray-300 dark:text-gray-600" />
                <p className="font-semibold">No work anniversaries today</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-right">
        <Link href="/leaves" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:underline">
          <span>Leave Management</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

    </div>
  );
};


// ====================================================
// 5. BIRTHDAY CELEBRATION HUB
// ====================================================
interface BirthdaysCardProps {
  birthdays?: any[];
}

export const CelebrationHub = ({ birthdays = [] }: BirthdaysCardProps) => {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600">
            <Cake size={16} />
          </div>
          <h3 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Upcoming Birthdays
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 text-[10px] font-bold">
          {birthdays.length} upcoming
        </span>
      </div>

      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
        {birthdays.map((b, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-pink-200 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                {b.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{b.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{b.designation}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block">{b.formattedDate}</span>
              <span className="text-[10px] text-pink-600 font-semibold">{b.relativeText}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ====================================================
// 6. SPRINT TASKS BOARD
// ====================================================
interface TaskItem {
  id: string;
  taskNumber: string;
  title: string;
  status: string;
  rawStatus?: string;
  priority?: string;
  dueDate?: string;
}

export const SprintTasksBoard = ({ tasks = [] }: { tasks?: TaskItem[] }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    const statusVal = ((t as any).rawStatus || t.status || '').toLowerCase().replace(/[\s_]+/g, '');
    
    if (filter === 'todo') {
      return statusVal === 'todo' || statusVal === 'backlog' || statusVal === 'open';
    }
    if (filter === 'doing') {
      return statusVal === 'doing' || statusVal === 'inprogress' || statusVal === 'inreview';
    }
    if (filter === 'done') {
      return statusVal === 'done' || statusVal === 'completed' || statusVal === 'finished';
    }
    return true;
  });

  const getStatusBadge = (status: string, rawStatus?: string) => {
    const s = (rawStatus || status || '').toLowerCase().replace(/[\s_]+/g, '');
    if (s === 'done' || s === 'completed') {
      return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50">Done</span>;
    }
    if (s === 'doing' || s === 'inprogress' || s === 'inreview') {
      return <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50">In Progress</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 text-[10px] font-bold border border-amber-200/50">To Do</span>;
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
      
      <div>
        {/* Header & Filter Capsules */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">Active Sprints & Priorities</h3>
            <p className="text-xs text-gray-400">Direct assignments from active engineering sprints</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'todo', label: 'To Do' },
              { id: 'doing', label: 'In Progress' },
              { id: 'done', label: 'Done' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === f.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Rows - Scrollable with matched container */}
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id || task.taskNumber}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-white dark:hover:bg-gray-800/80 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-lg shrink-0">
                    {task.taskNumber}
                  </span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {getStatusBadge(task.status, task.rawStatus)}
                  <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                    {task.dueDate || "--"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
              <CheckSquare size={24} className="mb-2 text-gray-300 dark:text-gray-600" />
              <p>No tasks found in this view.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-right">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
          <span>Open Full Task Board</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

    </div>
  );
};


// ====================================================
// 7. PROJECT PORTFOLIO MATRIX
// ====================================================
interface ProjectItem {
  id: string;
  name: string;
  status: string;
  progressPercentage?: number;
  deadline?: string;
  budget?: number;
  currency?: string;
  manager?: string;
}

export const ProjectPortfolioGrid = ({ projects = [] }: { projects?: ProjectItem[] }) => {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">Active Projects Portfolio</h3>
          <p className="text-xs text-gray-400">Real-time roadmap tracking and milestones</p>
        </div>
        <Link href="/my-projects" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
          View All <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map((p, idx) => {
          const progress = p.progressPercentage || (idx === 0 ? 80 : idx === 1 ? 65 : idx === 2 ? 45 : 30);
          return (
            <div key={p.id || idx} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-3 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white truncate">{p.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Manager: {p.manager || "Sunil Singh"}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-bold">
                  Active
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-blue-600 dark:text-blue-400">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                <span>Budget: {p.currency || 'USD'} {p.budget?.toLocaleString() || "15,000"}</span>
                <span>Due: {p.deadline || "30 Sep"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ====================================================
// 8. SCHEDULE & AGENDAS WIDGET
// ====================================================
export const AgendaScheduleWidget = ({ schedule = [] }: { schedule?: any[] }) => {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600">
            <CalendarIcon size={16} />
          </div>
          <h3 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            This Week's Agenda
          </h3>
        </div>
      </div>

      <div className="space-y-2.5">
        {schedule.length > 0 ? (
          schedule.slice(0, 4).map((event, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{event.title}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{event.type || 'Event'}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-500 font-mono">
                {event.date}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-gray-400">
            No events scheduled for this week.
          </div>
        )}
      </div>
    </div>
  );
};


// ====================================================
// 9. HELPDESK & SUPPORT TICKETS
// ====================================================
export const SupportDeskWidget = ({ tickets = [] }: { tickets?: any[] }) => {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600">
            <Ticket size={16} />
          </div>
          <h3 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Helpdesk & Requests
          </h3>
        </div>
        <Link href="/tickets" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
          Open Tickets <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="space-y-2.5">
        {tickets.length > 0 ? (
          tickets.map((t, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="min-w-0 pr-2">
                <span className="font-mono text-[10px] font-bold text-teal-600 block">{t.ticketNumber}</span>
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold shrink-0">
                {t.status || "Open"}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-gray-400">
            No active tickets submitted.
          </div>
        )}
      </div>
    </div>
  );
};
