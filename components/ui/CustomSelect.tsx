"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  datePeriod?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  placeholder = 'Select...',
  disabled = false,
  name
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full text-left", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-800 hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          buttonClassName
        )}
      >
        {selectedOption?.icon && (
          <span className="shrink-0">{selectedOption.icon}</span>
        )}
        <span className="flex-1 text-left truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption?.datePeriod && (
          <span className="text-[10px] text-slate-400 font-normal">
            {selectedOption.datePeriod}
          </span>
        )}
      </button>

      {isOpen && !disabled && (
        <div className={cn(
          "absolute left-0 mt-1 w-full z-50 rounded-lg bg-white border border-slate-200 shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100",
          dropdownClassName
        )}>
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:pointer-events-none",
                    isSelected && "bg-indigo-100 text-indigo-700 font-semibold"
                  )}
                >
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.datePeriod && (
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">
                      {option.datePeriod}
                    </span>
                  )}
                  {isSelected && <Check className="h-3 w-3 text-indigo-600 shrink-0 ml-1" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}
