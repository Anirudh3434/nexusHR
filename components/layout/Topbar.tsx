"use client";

import { Menu, LogOut, Sun, Moon, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 dark:border-gray-800 dark:bg-gray-950 transition-colors">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Mobile Logo - only visible on small screens */}
        <div className="flex items-center gap-2.5 md:hidden">
          <div className="h-11 w-11 rounded-full bg-[#03081c] flex items-center justify-center p-1.5 shadow-sm border border-[#03081c] shrink-0">
            <img 
              src={user.companyLogo || "/logo.png"} 
              alt={user.companyName || 'Logo'} 
              className="h-full w-full object-contain scale-110" 
            />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[120px]">
            {user.companyName || 'NexusHR'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Sun className="w-5 h-5 text-gray-600" />
          ) : (
            <Moon className="w-5 h-5 text-gray-300" />
          )}
        </button>

        <div className="flex items-center gap-2 md:gap-3 border-l border-gray-200 pl-2 md:pl-4 dark:border-gray-800">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
              {user.name}
            </span>
            <span className="text-xs text-gray-500 capitalize dark:text-gray-400">
              {user.role}
            </span>
          </div>
          
          {user.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-800 object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              {user.name?.charAt(0) || "U"}
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout} 
            className="ml-1 md:ml-2 px-2 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut size={18} />
            <span className="hidden lg:inline ml-2">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
