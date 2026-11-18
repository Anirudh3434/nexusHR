"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { FileText, BookOpen, Key, Link as LinkIcon, Plus, ChevronDown } from "lucide-react";

interface QuickAddDropdownProps {
  onAddDocument: () => void;
  onAddNote: () => void;
  onAddCredential: () => void;
  onAddResource: () => void;
}

export default function QuickAddDropdown({
  onAddDocument,
  onAddNote,
  onAddCredential,
  onAddResource,
}: QuickAddDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    {
      icon: FileText,
      label: "Upload Document",
      desc: "Upload PDF, specs, or assets",
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      borderColor: "border-blue-200/60 dark:border-blue-900/50",
      onClick: onAddDocument,
    },
    {
      icon: BookOpen,
      label: "Create Note",
      desc: "Meeting logs, decisions & RFCs",
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-emerald-200/60 dark:border-emerald-900/50",
      onClick: onAddNote,
    },
    {
      icon: Key,
      label: "Add Credential",
      desc: "API keys, secrets & logins",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-amber-200/60 dark:border-amber-900/50",
      onClick: onAddCredential,
    },
    {
      icon: LinkIcon,
      label: "Add Resource",
      desc: "GitHub, Figma, or web links",
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      borderColor: "border-purple-200/60 dark:border-purple-900/50",
      onClick: onAddResource,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 font-medium text-xs sm:text-sm h-9 px-3.5 rounded-xl border border-indigo-400/30 transition-all duration-200 active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Quick Add</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-80 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Create in Vault
            </span>
          </div>

          <div className="space-y-1">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    option.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all group"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${option.bgColor} ${option.borderColor} transition-transform group-hover:scale-105`}
                  >
                    <Icon className={`w-4 h-4 ${option.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {option.label}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{option.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
