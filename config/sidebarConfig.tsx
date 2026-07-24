import { 
  LayoutDashboard, Building, Users, ShieldAlert, FileBarChart2, Settings,
  UserSquare2, CalendarClock, CircleDollarSign, ActivitySquare, ShieldCheck, 
  UserPlus2, FileClock, Search, Megaphone, Calendar, Clock, Wallet, UserCheck, Briefcase, Palmtree, Award, Mail, FolderOpen, UserPlus, ChevronDown, LogOut, Ticket, UserX, Receipt, Sparkles, FileText, BarChart3, FolderKanban, KanbanSquare
} from "lucide-react";
import React from "react";

export type Role = "super_admin" | "admin" | "manager" | "hr" | "employee";

export interface SidebarRoute {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export interface SidebarGroup {
  name: string;
  icon: React.ReactNode;
  items: SidebarRoute[];
}

export const sidebarConfig: Record<Role, (SidebarRoute | SidebarGroup)[]> = {
  super_admin: [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Company Mgmt", href: "/commands", icon: <Building size={20} /> },
    { name: "User Mgmt", href: "/users", icon: <Users size={20} /> },
    { name: "Roles & Perms", href: "/permissions", icon: <ShieldAlert size={20} /> },
    { name: "All Reports", href: "/reports", icon: <FileBarChart2 size={20} /> },
    { name: "System Settings", href: "/settings", icon: <Settings size={20} /> },
  ],
  admin: [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    {
      name: "Recruitment",
      icon: <FolderOpen size={20} />,
      items: [
        { name: "Applicants", href: "/applicants", icon: <UserPlus size={20} /> },
        { name: "Recruitment Inbox", href: "/recruitment-inbox", icon: <Mail size={20} /> },
        { name: "Job Positions", href: "/job-positions", icon: <FolderOpen size={20} /> },
        { name: "Email Settings", href: "/email-settings", icon: <Settings size={20} /> },
      ]
    },
    {
      name: "Employee",
      icon: <Users size={20} />,
      items: [
        { name: "Employee Mgmt", href: "/employees", icon: <Users size={20} /> },
        { name: "Tickets", href: "/tickets", icon: <Ticket size={20} /> },
        { name: "Resignations", href: "/resignations", icon: <LogOut size={20} /> },
        { name: "Terminations", href: "/terminations", icon: <UserX size={20} /> },
        { name: "Expenses", href: "/expenses", icon: <Receipt size={20} /> },
        { name: "Department Mgmt", href: "/departments", icon: <Building size={20} /> },
        { name: "Designations", href: "/designations", icon: <Briefcase size={20} /> },
        { name: "Shifts", href: "/shifts", icon: <Clock size={20} /> },
      ]
    },
    {
      name: "Attendance & Leave",
      icon: <CalendarClock size={20} />,
      items: [
        { name: "Attendance", href: "/attendance", icon: <CalendarClock size={20} /> },
        { name: "Overtime Mgmt", href: "/overtime", icon: <Clock size={20} /> },
        { name: "Leave Mgmt", href: "/leaves", icon: <FileClock size={20} /> },
        { name: "Leave Types", href: "/leave-types", icon: <Palmtree size={20} /> },
        { name: "Leave Entitlements", href: "/leave-entitlements", icon: <Award size={20} /> },
      ]
    },
    {
      name: "Payroll",
      icon: <CircleDollarSign size={20} />,
      items: [
        { name: "Payroll", href: "/payroll", icon: <CircleDollarSign size={20} /> },
      ]
    },
    {
      name: "Communications",
      icon: <Megaphone size={20} />,
      items: [
        { name: "Notices", href: "/notices", icon: <Megaphone size={20} /> },
        { name: "Holidays", href: "/holidays", icon: <Calendar size={20} /> },
        { name: "Surveys", href: "/surveys", icon: <FileText size={20} /> },
      ]
    },
    {
      name: "Project Management",
      icon: <FolderKanban size={20} />,
      items: [
        { name: "Projects", href: "/projects", icon: <FolderKanban size={20} /> },
      ]
    },
    {
      name: "Reports & Settings",
      icon: <FileBarChart2 size={20} />,
      items: [
        { name: "Performance AI", href: "/reports/performance", icon: <Sparkles size={20} /> },
        { name: "Reports", href: "/reports", icon: <FileBarChart2 size={20} /> },
        { name: "Settings", href: "/settings", icon: <Settings size={20} /> },
      ]
    },
  ],
  manager: [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Team Overview", href: "/team", icon: <Users size={20} /> },
    { name: "Shifts", href: "/shifts", icon: <Clock size={20} /> },
    { name: "Employee Shifts", href: "/employee-shifts", icon: <UserCheck size={20} /> },
    { name: "Team Attendance", href: "/team-attendance", icon: <CalendarClock size={20} /> },
    { name: "Overtime Mgmt", href: "/overtime", icon: <Clock size={20} /> },
    { name: "Leave Approvals", href: "/leave-approvals", icon: <ShieldCheck size={20} /> },
    { name: "Holidays", href: "/holidays", icon: <Calendar size={20} /> },
    { name: "Performance", href: "/performance", icon: <ActivitySquare size={20} /> },
    {
      name: "Project Management",
      icon: <FolderKanban size={20} />,
      items: [
        { name: "Projects", href: "/projects", icon: <FolderKanban size={20} /> },
      ]
    },
  ],
  hr: [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    {
      name: "Recruitment",
      icon: <FolderOpen size={20} />,
      items: [
        { name: "Applicants", href: "/applicants", icon: <UserPlus size={20} /> },
        { name: "Recruitment Inbox", href: "/recruitment-inbox", icon: <Mail size={20} /> },
        { name: "Job Positions", href: "/job-positions", icon: <FolderOpen size={20} /> },
        { name: "Email Settings", href: "/email-settings", icon: <Settings size={20} /> },
      ]
    },
    {
      name: "Employee",
      icon: <UserSquare2 size={20} />,
      items: [
        { name: "Employee Mgmt", href: "/employees", icon: <UserSquare2 size={20} /> },
        { name: "Tickets", href: "/tickets", icon: <Ticket size={20} /> },
        { name: "Resignations", href: "/resignations", icon: <LogOut size={20} /> },
        { name: "Terminations", href: "/terminations", icon: <UserX size={20} /> },
        { name: "Expenses", href: "/expenses", icon: <Receipt size={20} /> },
        { name: "Shifts", href: "/shifts", icon: <Clock size={20} /> },
      ]
    },
    {
      name: "Attendance & Leave",
      icon: <CalendarClock size={20} />,
      items: [
        { name: "Attendance", href: "/attendance", icon: <CalendarClock size={20} /> },
        { name: "Overtime Mgmt", href: "/overtime", icon: <Clock size={20} /> },
        { name: "Leave Mgmt", href: "/leaves", icon: <FileClock size={20} /> },
        { name: "Leave Types", href: "/leave-types", icon: <Palmtree size={20} /> },
        { name: "Leave Entitlements", href: "/leave-entitlements", icon: <Award size={20} /> },
      ]
    },
    {
      name: "Communications",
      icon: <Megaphone size={20} />,
      items: [
        { name: "Notices", href: "/notices", icon: <Megaphone size={20} /> },
        { name: "Holidays", href: "/holidays", icon: <Calendar size={20} /> },
        { name: "Surveys", href: "/surveys", icon: <FileText size={20} /> },
      ]
    },
    {
      name: "Project Management",
      icon: <FolderKanban size={20} />,
      items: [
        { name: "Projects", href: "/projects", icon: <FolderKanban size={20} /> },
      ]
    },
    {
      name: "Reports",
      icon: <FileBarChart2 size={20} />,
      items: [
        { name: "Performance AI", href: "/reports/performance", icon: <Sparkles size={20} /> },
        { name: "Payroll (View)", href: "/payroll", icon: <Search size={20} /> },
      ]
    },
  ],
  employee: [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "My Profile", href: "/profile", icon: <UserSquare2 size={20} /> },
    { name: "My Attendance", href: "/my-attendance", icon: <CalendarClock size={20} /> },
    { name: "My Leaves", href: "/my-leaves", icon: <FileClock size={20} /> },
    { name: "My Tickets", href: "/my-tickets", icon: <Ticket size={20} /> },
    { name: "My Surveys", href: "/my-surveys", icon: <FileText size={20} /> },
    { name: "My Projects", href: "/my-projects", icon: <FolderKanban size={20} /> },
    { name: "My Resignation", href: "/my-resignation", icon: <LogOut size={20} /> },
    { name: "My Expenses", href: "/my-expenses", icon: <Receipt size={20} /> },
    { name: "Holidays", href: "/holidays", icon: <Calendar size={20} /> },
    { name: "My Performance", href: "/reports/performance", icon: <Sparkles size={20} /> },
    { name: "Payslips", href: "/payslips", icon: <CircleDollarSign size={20} /> },
  ],
};
