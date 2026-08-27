"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard, FileText, ClipboardList, KeyRound, LogOut, Menu, X, Briefcase,
} from "lucide-react";

export default function CandidatePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/candidate-login");
    } else if (!loading && user && !user.isCandidate) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || !user.isCandidate) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/candidate/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "My Application", href: "/candidate/my-application", icon: <FileText size={20} /> },
    { name: "My Onboarding", href: "/candidate/my-onboarding", icon: <ClipboardList size={20} /> },
    { name: "Change Password", href: "/candidate/change-password", icon: <KeyRound size={20} /> },
  ];

  const isActive = (href: string) => pathname === href || (pathname.startsWith(href) && href !== "/candidate/dashboard");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-indigo-100 bg-white transition-all duration-300 ease-in-out md:relative",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-18 items-center justify-between border-b border-indigo-100 px-4">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="h-12 w-12 rounded-full bg-[#03081c] flex items-center justify-center p-1.5 shadow-sm border border-[#03081c] shrink-0">
              <img 
                src={user.companyLogo || "/logo.png"} 
                alt={user.companyName || 'Logo'} 
                className="h-full w-full object-contain scale-110" 
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                {user.companyName || 'NexusHR'}
              </h1>
              <p className="text-[10px] font-semibold text-gray-400">Candidate Portal</p>
            </div>
          </div>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 text-sm font-medium transition-colors hover:bg-indigo-50",
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700"
              )}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="flex-1 truncate">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-indigo-100 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md p-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-indigo-100 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Briefcase size={15} />
              </div>
              <span className="font-bold text-indigo-600">NexusHR</span>
            </div>
            <h2 className="hidden text-base font-semibold text-gray-700 md:block">
              Candidate Portal
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{user.name}</span>
              <span className="text-xs text-gray-400">Job Applicant</span>
            </div>
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs">
                {user.name?.charAt(0) || "C"}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">{children}</main>
      </div>
    </div>
  );
}
