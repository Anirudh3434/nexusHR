"use client";

import { Menu, LogOut, Sun, Moon, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import { SmartLogoBadge } from "../ui/SmartLogoBadge";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();

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

        {/* Mobile Logo - only visible on small screens */}
        <div className="flex items-center gap-2.5 md:hidden">
          <SmartLogoBadge 
            src={user.companyLogo || "/logo.png"} 
            alt={user.companyName || 'Logo'} 
            className="h-9 w-9 p-1 border border-slate-200 shrink-0 shadow-sm dark:border-slate-700" 
          />
          <span className="font-display font-semibold text-foreground text-[15px] truncate max-w-[140px]">
            {user.companyName || 'NexusHR'}
          </span>
        </div>

        {/* Desktop context: quiet breadcrumb instead of empty space */}
        <p className="hidden md:block text-sm text-muted-foreground">
          {user.companyName || 'NexusHR'} <span aria-hidden className="mx-1 text-border">/</span> <span className="text-foreground font-medium capitalize">{user.role} workspace</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors"
          aria-label={!mounted ? "Toggle theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          title={!mounted ? "Toggle theme" : theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {!mounted ? (
            <span className="block w-[18px] h-[18px]" aria-hidden />
          ) : theme === "light" ? (
            <Moon className="w-[18px] h-[18px]" />
          ) : (
            <Sun className="w-[18px] h-[18px]" />
          )}
        </button>

        <div className="flex items-center gap-2 md:gap-3 border-l border-border pl-2 md:pl-4">
          <div className="hidden sm:flex flex-col text-right leading-tight">
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
          
          {user.avatar ? (
            <img
              src={getOptimizedImageUrl(user.avatar, 64, 64)}
              loading="lazy"
              alt={`${user.name} avatar`}
              className="h-8 w-8 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#0b1220] dark:bg-white flex items-center justify-center text-white dark:text-[#0b1220] font-semibold text-xs" aria-hidden>
              {user.name?.charAt(0) || "U"}
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout} 
            className="ml-1 md:ml-2 px-2 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={17} />
            <span className="hidden lg:inline ml-2">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
