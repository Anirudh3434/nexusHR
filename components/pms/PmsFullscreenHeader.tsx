"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { SmartLogoBadge } from "@/components/ui/SmartLogoBadge";
import { 
  FolderKanban, KanbanSquare, Sun, Moon, ChevronDown, Check,
  CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSummary {
  _id: string;
  name: string;
  projectNumber: string;
  status: string;
}

export function PmsFullscreenHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract active project ID from pathname if URL is /projects/[id]/...
  const projectMatch = pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
  const activeProjectId = projectMatch && projectMatch[1] !== "create" ? projectMatch[1] : null;

  // Extract current view mode if URL is /projects/[id]/[view]
  const viewMatch = pathname.match(/\/projects\/[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+)/);
  const activeView = viewMatch ? viewMatch[1] : "board";

  // Fetch projects list for quick switcher
  useEffect(() => {
    if (!user?.companyId) return;
    setLoadingProjects(true);
    fetch(`/api/projects?companyId=${user.companyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.projects) {
          let list = data.projects;
          if (user.role === "employee") {
            list = list.filter((p: any) =>
              p.members?.some((m: any) => m.employeeId === user.id)
            );
          }
          setProjects(list);
        }
      })
      .catch((err) => console.error("Error fetching projects for switcher:", err))
      .finally(() => setLoadingProjects(false));
  }, [user?.companyId, user?.role, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProject = projects.find((p) => p && p._id === activeProjectId);

  const handleSelectProject = (projectId: string) => {
    setIsProjectDropdownOpen(false);
    router.push(`/projects/${projectId}/${activeView || "board"}`);
  };

  return (
    <header className="h-14 border-b border-white/10 bg-[#0b1220] px-3 sm:px-4 flex items-center justify-between text-slate-200 shrink-0 select-none z-50">
      {/* Left: Brand / Logo + Project Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Brand & Mode Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <SmartLogoBadge
            src={user?.companyLogo || "/logo.png"}
            alt={user?.companyName || "Logo"}
            className="h-8 w-8 p-0.5 rounded-lg border border-white/20 shrink-0"
          />
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="font-semibold text-xs text-white truncate leading-tight">
              {user?.companyName || "NexusHR"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                PMS Studio
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-white/15 hidden sm:block shrink-0" />

        {/* Project Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors max-w-[180px] sm:max-w-[260px] md:max-w-[320px]"
            title="Switch project"
          >
            <FolderKanban className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span className="truncate">
              {activeProject?.name || "All Projects"}
            </span>
            {activeProject?.projectNumber && (
              <span className="hidden md:inline-block text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.2 rounded font-mono shrink-0">
                {activeProject.projectNumber}
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150",
                isProjectDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#0f172a] border border-white/15 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Project
                </span>
                <Link
                  href="/projects"
                  onClick={() => setIsProjectDropdownOpen(false)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    router.push("/projects");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors",
                    !activeProjectId ? "bg-white/10 text-white font-semibold" : "text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                    <span>Projects Overview</span>
                  </div>
                  {!activeProjectId && <Check className="w-3.5 h-3.5 text-teal-400" />}
                </button>

                {loadingProjects && (
                  <div className="px-3 py-2 text-xs text-slate-400">Loading projects...</div>
                )}

                {projects.filter(Boolean).map((proj) => {
                  const isSelected = proj._id === activeProjectId;
                  return (
                    <button
                      key={proj._id}
                      onClick={() => handleSelectProject(proj._id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors",
                        isSelected ? "bg-white/10 text-white font-semibold" : "text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <KanbanSquare className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                        <span className="truncate">{proj?.name || "Untitled Project"}</span>
                        {proj?.projectNumber && (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {proj.projectNumber}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-1 px-1">
                <Link
                  href="/tasks"
                  onClick={() => setIsProjectDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>All Tasks Management</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Nav Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          <Link
            href="/projects"
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              pathname === "/projects"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            Projects
          </Link>
          <Link
            href="/tasks"
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              pathname === "/tasks"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            Tasks
          </Link>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
