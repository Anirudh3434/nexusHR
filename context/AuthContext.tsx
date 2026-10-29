"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";

type Role = 'admin' | 'hr' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  status?: string;
  avatar?: string;
  companyId?: string;
  companyLogo?: string;
  companyName?: string;
  companyPrimaryColor?: string;
  companySecondaryColor?: string;
  companyThemeSource?: 'default' | 'logo' | 'custom';
  workShiftId?: string;
  salary?: number;
  employeeId?: string;
  mustChangePassword?: boolean;
  isCandidate?: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // UI state only. Authority lives in the HttpOnly session cookie
    // set by the server — this copy is never trusted for access control.
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      // Session cookie is set HttpOnly by the server. The mobile token
      // is kept for Bearer use; the web app authenticates via cookie.
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist an updated user object with equality guard to prevent render loops
  const updateUser = useCallback((updated: User) => {
    setUser((prev) => {
      if (!prev) return updated;
      const keys = Object.keys(updated) as (keyof User)[];
      const hasChanged = keys.some((k) => prev[k] !== updated[k]);
      if (!hasChanged) return prev; // Avoid unnecessary re-renders if nothing changed
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Ask the server to clear the HttpOnly session cookie (fire-and-forget).
    // Also drop any legacy readable cookies from before this fix.
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  const hasRole = useCallback((allowedRoles: Role[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const contextValue = useMemo(
    () => ({ user, loading, login, logout, hasRole, updateUser }),
    [user, loading, login, logout, hasRole, updateUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
