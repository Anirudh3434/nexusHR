"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: Theme;
  mounted: boolean;
  setTheme: (t: Theme, event?: React.MouseEvent | MouseEvent) => void;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
}

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (updateCallback: () => Promise<void> | void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
}

const STORAGE_KEY = "hrm-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  // Lets native controls (scrollbar, form fields, date pickers) follow the theme
  root.style.colorScheme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Deterministic initial state so SSR and client initial hydration match identically.
  // The blocking script in layout.tsx sets the .dark class pre-paint so there is no visual flash.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Keep <html> in sync + follow OS changes when the user has no saved choice.
  // The mounted flag guards the toggle icon against hydration mismatch.
  useEffect(() => {
    const initial = getInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client mount sync to avoid SSR hydration mismatch
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setThemeState(e.matches ? "dark" : "light");
        }
      } catch {
        /* ignore */
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  const switchTheme = (next: Theme, event?: React.MouseEvent | MouseEvent) => {
    if (next === theme) return;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const doc = typeof document !== "undefined" ? (document as DocumentWithViewTransition) : null;
    if (!doc || typeof doc.startViewTransition !== "function" || isReducedMotion) {
      setThemeState(next);
      applyTheme(next);
      return;
    }

    // Determine circular ripple origin coordinate (viewport relative)
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event && typeof event.clientX === "number" && (event.clientX !== 0 || event.clientY !== 0)) {
      x = event.clientX;
      y = event.clientY;
    } else {
      const target =
        (event && "currentTarget" in event && (event.currentTarget as HTMLElement)) ||
        (doc.activeElement as HTMLElement | null);
      if (target && typeof target.getBoundingClientRect === "function") {
        const rect = target.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setThemeState(next);
        applyTheme(next);
      });
    });

    transition.ready
      .then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];
        document.documentElement.animate(
          {
            clipPath,
          },
          {
            duration: 450,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          } as KeyframeAnimationOptions
        );
      })
      .catch(() => {
        /* Transition was aborted by a rapid subsequent toggle */
      });
  };

  const setTheme = (next: Theme, event?: React.MouseEvent | MouseEvent) => {
    switchTheme(next, event);
  };

  const toggleTheme = (event?: React.MouseEvent | MouseEvent) => {
    const next: Theme = theme === "light" ? "dark" : "light";
    switchTheme(next, event);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, mounted, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
