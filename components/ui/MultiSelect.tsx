"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  searchable?: boolean;
}

export function MultiSelect({
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  placeholder = 'Select...',
  disabled = false,
  name,
  searchable = true
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOptions = options.filter((o) => value.includes(o.value));

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500'];
    return colors[index % colors.length];
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full text-left", className)}>
      {name && <input type="hidden" name={name} value={value.join(',')} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]",
          buttonClassName
        )}
      >
        <span className="flex items-center gap-2 truncate min-w-0 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-medium"
                >
                  {option.icon ? (
                    <span className="shrink-0">{option.icon}</span>
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${getAvatarColor(options.indexOf(option))}`}>
                      {getInitials(option.label)}
                    </span>
                  )}
                  <span className="truncate max-w-[60px]">{option.label}</span>
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="text-[10px] text-slate-500">+{selectedOptions.length - 3}</span>
              )}
            </div>
          )}
        </span>
        <ChevronDown className={cn("ml-2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
      </button>

      {isOpen && !disabled && (
        <div className={cn(
          "absolute left-0 mt-1 w-full z-50 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100",
          dropdownClassName
        )}>
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto py-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleToggle(option.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center justify-between font-medium disabled:opacity-50 disabled:pointer-events-none gap-2",
                      isSelected && "bg-indigo-50/60 dark:bg-slate-800/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600"
                      )}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {option.icon ? (
                        <span className="shrink-0">{option.icon}</span>
                      ) : (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(options.indexOf(option))}`}>
                          {getInitials(option.label)}
                        </span>
                      )}
                      <span className="truncate">{option.label}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                {searchQuery ? 'No results found' : 'No options available'}
              </div>
            )}
          </div>

          {selectedOptions.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center justify-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
