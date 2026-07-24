"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { sidebarConfig, SidebarGroup, SidebarRoute, Role } from "../../config/sidebarConfig";
import { cn } from "../../lib/utils";
import { Menu, ChevronLeft, ChevronRight, LogOut, ChevronDown, ChevronUp, X, KanbanSquare } from "lucide-react";

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
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user?.companyId) {
      fetchProjects();
    }
  }, [user?.companyId]);

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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 transition-all duration-300 ease-in-out md:relative md:flex",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header Logo Area */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap animate-in fade-in zoom-in duration-300">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                N
              </div>
              <h1 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-500">
                NexusHR
              </h1>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold animate-in fade-in duration-300">
              N
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
          className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 z-50 transition-transform"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

      {/* Navigation Links rendering dynamically per role */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-hide">
        {navigationItems.map((item, index) => {
          // Handle Group with Accordion
          if (isGroup(item)) {
            const isExpanded = expandedGroups[item.name] ?? false;
            const hasActiveChild = item.items.some(child => 
              pathname === child.href || (pathname.startsWith(child.href) && child.href !== "/")
            );
            
            // Check if this is the Project Management group
            const isProjectManagement = item.name === "Project Management";
            
            return (
              <div key={item.name} className="space-y-1">
                {/* Group Header */}
                <button
                  onClick={() => !collapsed && toggleGroup(item.name)}
                  disabled={collapsed}
                  className={cn(
                    "w-full group relative flex items-center gap-3 rounded-lg p-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                    hasActiveChild || (isProjectManagement && pathname.startsWith("/projects") && !pathname.includes("/create"))
                      ? "bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300",
                    collapsed && "cursor-default"
                  )}
                >
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
                    <div className="absolute left-full ml-4 hidden rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:block group-hover:opacity-100 dark:bg-gray-800 z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </button>
                
                {/* Group Items - Accordion Content */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                    {item.items.map((child) => {
                      const isChildActive = pathname === child.href || (pathname.startsWith(child.href) && child.href !== "/");
                      
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                            isChildActive
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                              : "text-gray-600 dark:text-gray-400"
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
                          <div className="px-3 py-2 text-sm text-gray-500">Loading projects...</div>
                        ) : projects.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No projects</div>
                        ) : (
                          projects.map((project) => (
                            <Link
                              key={project._id}
                              href={`/projects/${project._id}/board`}
                              className={cn(
                                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                                pathname.startsWith(`/projects/${project._id}`)
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                                  : "text-gray-600 dark:text-gray-400"
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg p-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              
              {!collapsed && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
              
              {!collapsed && pendingCount > 0 && (
                <span className="flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {pendingCount}
                </span>
              )}

              {/* Tooltip visible only when collapsed on hover */}
              {collapsed && (
                <div className="absolute left-full ml-4 hidden rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:block group-hover:opacity-100 dark:bg-gray-800 z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Account Area Logout Component Wrapper */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <button
          onClick={logout}
          className={cn(
            "group relative flex w-full items-center rounded-md p-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout Account</span>}
          {collapsed && (
            <div className="absolute left-full ml-4 hidden rounded-md bg-red-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:block group-hover:opacity-100 z-50 whitespace-nowrap">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
    </>
  );
};
