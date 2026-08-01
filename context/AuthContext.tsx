"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Role = 'admin' | 'hr' | 'manager' | 'employee';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  status?: string;
  avatar?: string;
  companyId?: string;
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
    // Check localStorage on mount
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Re-set cookie for middleware (in case it was cleared)
        document.cookie = `user=${encodeURIComponent(storedUser)}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
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
      localStorage.setItem("token", data.token);
      
      // Set cookie for middleware route protection
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      if (data.token) {
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      }
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Persist an updated user object (e.g. after changing password clears the flag)
  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
    document.cookie = `user=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Clear cookies
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  const hasRole = (allowedRoles: Role[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, updateUser }}>
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
