"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Sun, Moon, Plug } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import { SmartLogoBadge } from "../ui/SmartLogoBadge";
import { Avatar } from "../ui/Avatar";
import { NotificationBell } from "../notifications/NotificationBell";
import { ConnectMcpModal } from "../mcp/ConnectMcpModal";

interface TopbarProps {
  onMenuClick: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  hierarchy: "Org Hierarchy",
  team: "Team Overview",
  attendance: "Attendance",
  "team-attendance": "Team Attendance",
  "my-attendance": "My Attendance",
  leaves: "Leaves",
  "leave-approvals": "Leave Approvals",
  "leave-entitlements": "Leave Entitlements",
  "leave-types": "Leave Types",
  "my-leaves": "My Leaves",
  payroll: "Payroll",
  payslips: "Payslips",
  salary: "Salary",
  expenses: "Expenses",
  "my-expenses": "My Expenses",
  projects: "Projects",
  "my-projects": "My Projects",
  tasks: "Tasks",
  "my-tasks": "My Tasks",
  "today-tasks": "Today Tasks",
  sprints: "Sprints",
  tickets: "Tickets",
  "my-tickets": "My Tickets",
  notices: "Notice Board",
  probation: "Probation",
  resignations: "Resignations",
  "my-resignation": "My Resignation",
  terminations: "Terminations",
  onboarding: "Onboarding",
  "my-onboarding": "My Onboarding",
  recruitment: "Recruitment",
  "recruitment-inbox": "Recruitment Inbox",
  applicants: "Applicants",
  "job-positions": "Job Openings",
  departments: "Departments",
  designations: "Designations",
  shifts: "Shifts",
  "employee-shifts": "Employee Shifts",
  overtime: "Overtime",
  holidays: "Holidays",
  permissions: "Permissions",
  surveys: "Surveys",
  "my-surveys": "My Surveys",
  performance: "Performance",
  reports: "Reports",
  "reports-analytics": "Reports & Analytics",
  "retention-analytics": "Retention Analytics",
  "hr-knowledge-base": "HR Knowledge Base",
  settings: "Settings",
  "email-settings": "Email Settings",
  profile: "Profile",
  billing: "Billing",
  commands: "Commands",
  users: "Users",
  board: "Board",
  list: "List",
  timeline: "Timeline",
  docs: "Documents",
  create: "Create",
  new: "New",
};

function formatSegmentLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const pathname = usePathname();
  const [showMcpModal, setShowMcpModal] = useState(false);

  const breadcrumbs = useMemo(() => {
    if (!pathname || pathname === "/" || pathname === "/dashboard") {
      return [{ label: "Dashboard", href: "/dashboard" }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const items: Array<{ label: string; href: string }> = [];
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;

      // Check for 24-character hexadecimal Mongo ObjectId
      const isObjectId = /^[a-f\d]{24}$/i.test(seg);

      if (isObjectId) {
        // If there's a sub-page after the ID (e.g., /projects/123/board), skip showing the ID hash
        const hasNext = i < segments.length - 1;
        if (!hasNext) {
          items.push({ label: "Details", href: currentPath });
        }
      } else {
        items.push({
          label: formatSegmentLabel(seg),
          href: currentPath,
        });
      }
    }

    return items.length > 0 ? items : [{ label: "Dashboard", href: "/dashboard" }];
  }, [pathname]);

  const userPosition = useMemo(() => {
    if (user?.designation?.trim()) return user.designation.trim();
    if (user?.role === "admin") return "Administrator";
    if (user?.role === "hr") return "HR Manager";
    if (user?.role === "manager") return "Team Manager";
    return "Team Member";
  }, [user?.designation, user?.role]);

  if (!user) return null;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur md:px-6 transition-colors">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 md:hidden text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic Desktop Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors font-medium text-muted-foreground"
          >
            {user.companyName || 'NexusHR'}
          </Link>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.href || idx}>
                <span aria-hidden className="text-border">/</span>
                {isLast ? (
                  <span className="text-foreground font-semibold">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        <button
          type="button"
          onClick={() => setShowMcpModal(true)}
          className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 h-8 rounded-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 transition-all text-xs font-semibold shadow-2xs group relative overflow-visible"
          title="Connect NexusHR to Cursor, Claude Desktop, Antigravity, or other AI agents (MCP)"
        >
          <div className="relative shrink-0 w-6 h-6 flex items-center justify-center pointer-events-none">
            <img
              src="/icons/connect-ai-plug.png"
              alt="Connect AI"
              className="w-7 h-7 max-w-none object-contain -translate-y-1 -translate-x-0.5 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200 drop-shadow-xs select-none pointer-events-none"
            />
          </div>
          <span>Connect AI</span>
        </button>
        <button
          onClick={toggleTheme}
          className="hidden md:flex rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors"
          aria-label={!mounted ? "Toggle theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          title={!mounted ? "Toggle theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {!mounted ? (
            <span className="block w-[18px] h-[18px]" aria-hidden />
          ) : (
            <span className="relative w-[18px] h-[18px] flex items-center justify-center">
              <Sun
                className={`w-[18px] h-[18px] transition-all duration-300 absolute ${
                  theme === "dark"
                    ? "rotate-0 scale-100 opacity-100 text-amber-400"
                    : "-rotate-90 scale-0 opacity-0 text-muted-foreground"
                }`}
              />
              <Moon
                className={`w-[18px] h-[18px] transition-all duration-300 absolute ${
                  theme === "light"
                    ? "rotate-0 scale-100 opacity-100 text-muted-foreground"
                    : "rotate-90 scale-0 opacity-0 text-muted-foreground"
                }`}
              />
            </span>
          )}
        </button>

        <NotificationBell />

        <div className="flex items-center gap-2 md:gap-3 md:border-l md:border-border md:pl-4">
          <div className="hidden sm:flex flex-col text-right leading-tight">
            <span
              className="text-sm font-semibold text-foreground truncate max-w-[140px]"
              title={user.name}
            >
              {user.name}
            </span>
            <span
              className="text-xs text-muted-foreground capitalize truncate max-w-[140px]"
              title={user.department ? `${userPosition} (${user.department})` : userPosition}
            >
              {userPosition}
            </span>
          </div>
          
          <Link href="/profile" className="focus:outline-none transition-transform active:scale-95">
            <Avatar name={user.name} src={user.avatar} size="sm" bordered />
          </Link>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout} 
            className="hidden md:flex ml-1 md:ml-2 px-2 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={17} />
            <span className="hidden lg:inline ml-2">Log out</span>
          </Button>
        </div>
      </div>
      <ConnectMcpModal isOpen={showMcpModal} onClose={() => setShowMcpModal(false)} />
    </header>
  );
};
