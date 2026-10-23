"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: Theme;
  mounted: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
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
  // Start with a lazy initializer so the first client render already matches
  // the persisted / system preference (the blocking script in layout.tsx sets
  // the .dark class pre-paint to avoid a flash).
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "light" : getInitialTheme()
  );
  const [mounted, setMounted] = useState(false);

  // Keep <html> in sync + follow OS changes when the user has no saved choice.
  // The mounted flag guards the toggle icon against hydration mismatch.
  useEffect(() => {
    applyTheme(theme);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; theme sync lives in the effect below
  }, []);

  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  const setTheme = (next: Theme) => setThemeState(next);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
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
