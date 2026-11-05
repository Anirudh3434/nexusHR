"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function RootRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user && typeof window !== "undefined" && !window.location.search.includes("switch=true")) {
      const destination = 
        (user.role as string) === "super_admin" 
          ? "/super-admin" 
          : user.isCandidate 
            ? "/candidate/dashboard" 
            : "/dashboard";
      router.replace(destination);
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white p-2 shadow-lg flex items-center justify-center animate-pulse">
          <img 
            src="/logo.png" 
            alt="NexusHR Logo" 
            className="h-full w-full object-contain rounded-full" 
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
          <span>Routing to workspace...</span>
        </div>
      </div>
    </div>
  );
}
