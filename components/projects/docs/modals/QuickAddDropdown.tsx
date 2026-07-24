"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { FileText, BookOpen, Key, Link, Plus, ChevronDown } from "lucide-react";

interface QuickAddDropdownProps {
  onAddDocument: () => void;
  onAddNote: () => void;
  onAddCredential: () => void;
  onAddResource: () => void;
}

export default function QuickAddDropdown({ onAddDocument, onAddNote, onAddCredential, onAddResource }: QuickAddDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { icon: FileText, label: 'Document', onClick: onAddDocument },
    { icon: BookOpen, label: 'Note', onClick: onAddNote },
    { icon: Key, label: 'Credential', onClick: onAddCredential },
    { icon: Link, label: 'Resource', onClick: onAddResource },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Quick Add
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    option.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
