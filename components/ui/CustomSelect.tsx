"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, SearchX } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CustomSelectOption {
  value: string;
  label: React.ReactNode;
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
  id?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}

/**
 * Theme-aware dropdown that replaces the browser's native <select> so menus
 * match the ledger surfaces (rounded corners, token colors, dark mode).
 * Fully keyboard operable: ↑/↓, Home/End, type-ahead, Enter/Space, Esc.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  placeholder = "Select...",
  disabled = false,
  name,
  id,
  ariaLabel,
  emptyMessage = "No options available",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef<{ query: string; timer: ReturnType<typeof setTimeout> | null }>({
    query: "",
    timer: null,
  });

  const baseId = useId();
  const triggerId = id ?? `${baseId}-trigger`;
  const listId = `${baseId}-listbox`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabledIndex = useCallback(
    () => options.findIndex((option) => !option.disabled),
    [options]
  );

  const openList = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex());
  }, [disabled, selectedIndex, firstEnabledIndex]);

  const closeList = useCallback((refocusTrigger = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      closeList();
    },
    [options, onChange, closeList]
  );

  const moveActive = useCallback(
    (delta: 1 | -1) => {
      if (!options.length) return;
      setActiveIndex((previous) => {
        let next = previous;
        for (let step = 0; step < options.length; step += 1) {
          next = next + delta;
          if (next < 0) next = options.length - 1;
          if (next >= options.length) next = 0;
          if (!options[next].disabled) return next;
        }
        return previous;
      });
    },
    [options]
  );

  // Close when the pointer goes down outside of the dropdown.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  // Clear the type-ahead buffer if the component unmounts mid-keystroke.
  useEffect(() => {
    return () => {
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (isOpen) moveActive(1);
        else openList();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isOpen) moveActive(-1);
        else openList();
        break;
      case "Home":
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(firstEnabledIndex());
        }
        break;
      case "End":
        if (isOpen) {
          event.preventDefault();
          const reversed = options
            .map((option, index) => ({ option, index }))
            .reverse()
            .find((entry) => !entry.option.disabled);
          setActiveIndex(reversed ? reversed.index : -1);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) selectOption(activeIndex);
        else openList();
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          closeList();
        }
        break;
      case "Tab":
        if (isOpen) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
        break;
      default: {
        // Type-ahead: jump to the first option starting with what was typed.
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;

        const state = typeaheadRef.current;
        state.query += event.key.toLowerCase();
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => {
          state.query = "";
        }, 500);

        const match = options.findIndex(
          (option) =>
            !option.disabled &&
            typeof option.label === "string" &&
            option.label.toLowerCase().startsWith(state.query)
        );

        if (match >= 0) {
          if (!isOpen) setIsOpen(true);
          setActiveIndex(match);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full text-left", className)}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? closeList(false) : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors",
          "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-primary/60 ring-2 ring-primary/10",
          buttonClassName
        )}
      >
        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
        <span
          className={cn(
            "flex-1 truncate text-left",
            !selectedOption && "font-normal text-muted-foreground"
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption?.datePeriod && (
          <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
            {selectedOption.datePeriod}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className={cn(
            "absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl shadow-black/10",
            "animate-in fade-in-0 zoom-in-95 duration-100",
            dropdownClassName
          )}
        >
          {options.length > 0 ? (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <button
                  key={option.value === "" ? "__empty-option" : option.value}
                  id={`${listId}-option-${index}`}
                  data-option-index={index}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  tabIndex={-1}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => selectOption(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    "disabled:pointer-events-none disabled:opacity-40",
                    isActive && "bg-muted",
                    isSelected ? "font-semibold text-primary" : "text-foreground"
                  )}
                >
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.datePeriod && (
                    <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
                      {option.datePeriod}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <SearchX className="h-3.5 w-3.5 shrink-0" />
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
