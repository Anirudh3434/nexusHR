"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { usePathname } from "next/navigation";

interface PmsFullscreenContextType {
  isFullscreen: boolean;
  isPmsSubdomain: boolean;
  openInNewTab: (path?: string) => void;
  requestBrowserFullscreen: () => Promise<void>;
  isBrowserFullscreen: boolean;
}

const PmsFullscreenContext = createContext<PmsFullscreenContextType | undefined>(undefined);

function PmsFullscreenProviderContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Detect whether currently running on pms subdomain (e.g. pms.localhost:3000 or pms.nexus.com)
  const [isPmsSubdomain, setIsPmsSubdomain] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPmsSubdomain(window.location.hostname.toLowerCase().startsWith("pms."));
    }
  }, []);

  // Fullscreen PMS mode is strictly active when on the pms subdomain
  const isFullscreen = isPmsSubdomain;

  // Track browser native fullscreen state (F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const openInNewTab = useCallback((targetPath?: string) => {
    if (typeof window === "undefined") return;

    let path = targetPath || window.location.pathname;
    if (!path.startsWith("/")) path = `/${path}`;

    const host = window.location.host; // e.g. "localhost:3000" or "example.com"
    const protocol = window.location.protocol; // e.g. "http:"

    // Ensure host has pms. subdomain
    let targetHost = host;
    if (!host.toLowerCase().startsWith("pms.")) {
      targetHost = `pms.${host}`;
    }

    let fullUrl = `${protocol}//${targetHost}${path}`;

    // Pass token across subdomains for initial session handoff if available
    const token = localStorage.getItem("token");
    if (token) {
      const sep = fullUrl.includes("?") ? "&" : "?";
      fullUrl = `${fullUrl}${sep}token=${encodeURIComponent(token)}`;
    }

    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }, []);

  const requestBrowserFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
  }, []);

  return (
    <PmsFullscreenContext.Provider
      value={{
        isFullscreen,
        isPmsSubdomain,
        openInNewTab,
        requestBrowserFullscreen,
        isBrowserFullscreen,
      }}
    >
      {children}
    </PmsFullscreenContext.Provider>
  );
}

export function PmsFullscreenProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PmsFullscreenProviderContent>{children}</PmsFullscreenProviderContent>
    </Suspense>
  );
}

export function usePmsFullscreen() {
  const context = useContext(PmsFullscreenContext);
  if (!context) {
    return {
      isFullscreen: false,
      isPmsSubdomain: false,
      openInNewTab: (path?: string) => {
        if (typeof window === "undefined") return;
        let target = path || "/projects";
        if (!target.startsWith("/")) target = `/${target}`;
        const host = window.location.host;
        const targetHost = host.toLowerCase().startsWith("pms.") ? host : `pms.${host}`;
        const token = localStorage.getItem("token");
        let full = `${window.location.protocol}//${targetHost}${target}`;
        if (token) full += `?token=${encodeURIComponent(token)}`;
        window.open(full, "_blank", "noopener,noreferrer");
      },
      requestBrowserFullscreen: async () => {},
      isBrowserFullscreen: false,
    };
  }
  return context;
}
