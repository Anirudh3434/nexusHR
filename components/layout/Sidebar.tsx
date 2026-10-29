"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useEntitlements } from "../../context/EntitlementsContext";
import { sidebarConfig, SidebarGroup, SidebarRoute, Role } from "../../config/sidebarConfig";
import { cn } from "../../lib/utils";
import { featureForPath, type Feature } from "../../lib/entitlements";
import { ChevronLeft, ChevronRight, ChevronDown, X, KanbanSquare, Lock } from "lucide-react";
import { SmartLogoBadge } from "../ui/SmartLogoBadge";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Recruitment": true,
    "Employee": true,
    "Attendance & Leave": true,
    "Project Management": true,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { has } = useEntitlements();
  const pmsEnabled = has("pms");

  const lockedFeatureFor = (href: string): Feature | null => {
    const feature = featureForPath(href);
    return feature && !has(feature) ? feature : null;
  };
  const goUpgrade = (feature: Feature) => router.push(`/billing?upgrade=${feature}`);

  const logoFetchedRef = useRef(false);

  useEffect(() => {
    if (user?.companyId && pmsEnabled) {
      fetchProjects();
    }
    if (user?.companyId && !user.companyLogo && !logoFetchedRef.current) {
      logoFetchedRef.current = true;
      fetch(`/api/settings?companyId=${user.companyId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.logo && user && data.logo !== user.companyLogo) {
            updateUser({ ...user, companyLogo: data.logo });
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId, pmsEnabled]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch(`/api/projects?companyId=${user?.companyId}`);
      const data = await response.json();
      
      // For employees, filter projects they are assigned to
      let filteredProjects = data.projects || [];
      if (user?.role === 'employee') {
        filteredProjects = filteredProjects.filter((project: any) => 
          project.members && project.members.some((member: any) => 
            member.employeeId === user.id
          )
        );
      }
      
      setProjects(filteredProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Protect execution flow
  if (!user) return null;

  // Type assertion ensuring we drop back to "employee" if role mapping fails
  const safeRole = (user.role && sidebarConfig[user.role as Role]) ? user.role as Role : "employee";
  const navigationItems = sidebarConfig[safeRole];

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Check if item is a group
  const isGroup = (item: SidebarRoute | SidebarGroup): item is SidebarGroup => {
    return 'items' in item;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0b1220] text-slate-200 transition-all duration-300 ease-in-out md:relative md:flex",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header Logo Area */}
        <div className="flex h-18 items-center justify-between px-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden animate-in fade-in zoom-in duration-300 min-w-0 pr-2">
              <SmartLogoBadge 
                src={user?.companyLogo || "/logo.png"} 
                alt={user?.companyName || 'Logo'} 
                className="h-10 w-10 p-1 rounded-xl border border-white/20 shrink-0" 
              />
              <div className="flex flex-col min-w-0">
                <span className="font-display text-[17px] font-semibold tracking-tight text-white truncate">
                  {user?.companyName || 'NexusHR'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {safeRole === "employee" ? "My workspace" : `${safeRole} workspace`}
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex justify-center">
              <SmartLogoBadge 
                src={user?.companyLogo || "/favicon.png"} 
                alt={user?.companyName || 'Logo'} 
                className="h-10 w-10 p-1 rounded-xl border border-white/20 animate-in fade-in duration-300" 
              />
            </div>
          )}
          
          {/* Mobile Close Button */}
          <button 
            className="p-2 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Expand/Collapse Toggle Button located on edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#0b1220] shadow-none text-slate-400 hover:text-white hover:border-white/30 z-50 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

      {/* Navigation Links rendering dynamically per role */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 sidebar-scroll" aria-label="Workspace navigation">
        {navigationItems.map((item, index) => {
          // Handle Group with Accordion
          if (isGroup(item)) {
            const isExpanded = expandedGroups[item.name] ?? false;
            const hasActiveChild = item.items.some(child => 
              pathname === child.href || (pathname.startsWith(child.href) && child.href !== "/")
            );
            
            // Check if this is the Project Management group
            const isProjectManagement = item.name === "Project Management";

            // Plan gating: a group that is entirely gated (e.g. Project
            // Management, AI & Analytics) collapses to a locked row. Mixed
            // groups keep their core items and lock only the gated children.
            const groupFeature = featureForPath(item.items[0]?.href ?? "");
            const allChildrenLocked =
              item.items.length > 0 &&
              item.items.every((child) => {
                const f = featureForPath(child.href);
                return !!f && !has(f);
              });

            if (allChildrenLocked) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => goUpgrade(groupFeature as Feature)}
                  aria-disabled
                  title={`${item.name} isn't in your plan — upgrade to unlock`}
                  className={cn(
                    "w-full group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <div className="flex-shrink-0 opacity-70">
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.name}</span>
                      <Lock size={14} className="text-amber-300/80" />
                    </>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-4 hidden rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-lg transition-opacity group-hover:block dark:bg-gray-800 dark:text-white z-50 whitespace-nowrap">
                      {item.name} — upgrade
                    </div>
                  )}
                </button>
              );
            }

            return (
              <div key={item.name} className="space-y-1">
                {/* Group Header */}
                <button
                  onClick={() => !collapsed && toggleGroup(item.name)}
                  disabled={collapsed}
                  aria-expanded={!collapsed && isExpanded}
                  className={cn(
                    "w-full group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    hasActiveChild || (isProjectManagement && pathname.startsWith("/projects") && !pathname.includes("/create"))
                      ? "bg-white/8 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    collapsed && "cursor-default justify-center px-0"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal-300 transition-opacity",
                      hasActiveChild ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                  
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.name}</span>
                      <ChevronDown 
                        size={16} 
                        className={cn(
                          "transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-4 hidden rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-lg transition-opacity group-hover:block dark:bg-gray-800 dark:text-white z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </button>
                
                {/* Group Items - Accordion Content */}
                {!collapsed && isExpanded && (
                  <div className="ml-[18px] pl-3 border-l border-white/10 space-y-0.5 py-0.5">
                    {item.items.map((child) => {
                      const isChildActive = pathname === child.href || (pathname.startsWith(child.href) && child.href !== "/");
                      const childLocked = lockedFeatureFor(child.href);

                      if (childLocked) {
                        return (
                          <button
                            key={child.href}
                            type="button"
                            onClick={() => goUpgrade(childLocked)}
                            aria-disabled
                            title={`${child.name} isn't in your plan — upgrade to unlock`}
                            className="group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                          >
                            <div className="flex-shrink-0 scale-90 opacity-70">
                              {child.icon}
                            </div>
                            <span className="truncate">{child.name}</span>
                            <Lock size={13} className="ml-auto text-amber-300/80" />
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={isChildActive ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                            isChildActive
                              ? "bg-white/10 text-white font-semibold"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                          )}
                        >
                          <div className="flex-shrink-0 scale-90">
                            {child.icon}
                          </div>
                          <span className="truncate">{child.name}</span>
                        </Link>
                      );
                    })}
                    
                    {/* Add projects list if this is Project Management */}
                    {isProjectManagement && (
                      <>
                        {loadingProjects ? (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Loading projects...</div>
                        ) : projects.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">No projects</div>
                        ) : (
                          projects.map((project) => (
                            <Link
                              key={project._id}
                              href={`/projects/${project._id}/board`}
                              className={cn(
                                "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                                pathname.startsWith(`/projects/${project._id}`)
                                  ? "bg-white/10 text-white font-semibold"
                                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                              )}
                            >
                              <KanbanSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{project.name}</span>
                            </Link>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }
          
          // Handle Single Item
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");
          const pendingCount = (item.name.includes("Approval") || item.name.includes("Leave")) ? 3 : 0;
          const itemFeature = lockedFeatureFor(item.href);

          if (itemFeature) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => goUpgrade(itemFeature)}
                aria-disabled
                title={`${item.name} isn't in your plan — upgrade to unlock`}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300",
                  collapsed && "justify-center px-0"
                )}
              >
                <div className="flex-shrink-0 opacity-70">
                  {item.icon}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    <Lock size={14} className="text-amber-300/80" />
                  </>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-4 hidden rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-lg transition-opacity group-hover:block dark:bg-gray-800 dark:text-white z-50 whitespace-nowrap">
                    {item.name} — upgrade
                  </div>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal-300 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              
              {!collapsed && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
              
              {!collapsed && pendingCount > 0 && (
                <span className="flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  {pendingCount}
                </span>
              )}

              {/* Tooltip visible only when collapsed on hover */}
              {collapsed && (
                <div className="absolute left-full ml-4 hidden rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-lg transition-opacity group-hover:block dark:bg-gray-800 dark:text-white z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom App Info */}
      <div className="border-t border-white/10 p-3 pb-6">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Mobile app</span>
            <span className="tabular text-[11px]">v6.0.13</span>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
