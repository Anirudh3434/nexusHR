"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  applyDynamicCompanyTheme, 
  resetThemeToDefault, 
  syncCompanyLogoTheme,
  isDefaultLogo,
  DEFAULT_BRAND_PRIMARY
} from "@/lib/imageUtils";
import { BRANDING_UPDATED_EVENT, Settings, getSettings } from "@/services/settingsService";

/**
 * CompanyThemeSync:
 * Manages DOM CSS custom properties (--primary, --secondary, etc.) across the entire application.
 *
 * Designed to prevent render loops:
 * - NEVER calls updateUser or triggers state mutations in parent contexts.
 * - Uses a ref to ensure settings are fetched at most ONCE per companyId.
 * - Uses lastAppliedRef to prevent redundant CSS property mutations.
 * - Listens for live BRANDING_UPDATED_EVENT so edits apply in real time without polling.
 */
export function CompanyThemeSync() {
  const { user } = useAuth();
  const lastAppliedRef = useRef<string>("");
  const fetchedCompanyIdRef = useRef<string | null>(null);

  const applyThemeFromConfig = useCallback((config: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    logo?: string | null;
  }) => {
    const { primaryColor, secondaryColor, logo } = config;

    // 1. If custom primary color is present (e.g. #D946EF)
    if (primaryColor && primaryColor !== DEFAULT_BRAND_PRIMARY && primaryColor !== "#2563eb") {
      const key = `custom:${primaryColor}:${secondaryColor || ""}`;
      if (lastAppliedRef.current !== key) {
        lastAppliedRef.current = key;
        applyDynamicCompanyTheme(primaryColor, secondaryColor);
      }
      return;
    }

    // 2. If a custom uploaded logo exists
    if (logo && !isDefaultLogo(logo)) {
      syncCompanyLogoTheme(logo).then((extracted) => {
        if (extracted) {
          lastAppliedRef.current = `logo:${extracted.primary}:${extracted.secondary}`;
        }
      });
      return;
    }

    // 3. Fallback: No logo and no custom colors -> keep exact product default (Harbor & Pine)
    if (lastAppliedRef.current !== "default") {
      lastAppliedRef.current = "default";
      resetThemeToDefault();
    }
  }, []);

  // Step 1: Immediate sync from available user branding fields (runs only when values actually change)
  useEffect(() => {
    if (user?.companyPrimaryColor || user?.companyLogo) {
      applyThemeFromConfig({
        primaryColor: user.companyPrimaryColor,
        secondaryColor: user.companySecondaryColor,
        logo: user.companyLogo,
      });
    } else if (!user?.companyId) {
      resetThemeToDefault();
    }
  }, [user?.companyPrimaryColor, user?.companySecondaryColor, user?.companyLogo, user?.companyId, applyThemeFromConfig]);

  // Step 2: Fetch company settings ONCE per company ID on mount
  useEffect(() => {
    const companyId = user?.companyId;
    if (!companyId) return;
    if (fetchedCompanyIdRef.current === companyId) return;
    fetchedCompanyIdRef.current = companyId;

    getSettings({ companyId })
      .then((settings: Settings) => {
        applyThemeFromConfig({
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          logo: settings.logo,
        });
      })
      .catch((err) => {
        console.warn("Could not fetch remote company settings for theme sync:", err);
      });
  }, [user?.companyId, applyThemeFromConfig]);

  // Step 3: Listen to live branding updates across the app (when user saves in settings)
  useEffect(() => {
    const handleBrandingUpdated = (e: CustomEvent<Settings>) => {
      const detail = e.detail;
      if (!detail) return;
      applyThemeFromConfig({
        primaryColor: detail.primaryColor,
        secondaryColor: detail.secondaryColor,
        logo: detail.logo,
      });
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated as EventListener);
    return () => {
      window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated as EventListener);
    };
  }, [applyThemeFromConfig]);

  // Step 4: Dark mode mutation observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.hasCustomBrand === "true") {
        const currentPrimary = document.documentElement.style.getPropertyValue("--brand-primary");
        const currentSecondary = document.documentElement.style.getPropertyValue("--brand-secondary");
        if (currentPrimary) {
          applyDynamicCompanyTheme(currentPrimary, currentSecondary);
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Filter out third-party extension hydration noise (e.g. Bitwarden bis_skin_checked, Grammarly)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const filter = (orig: (...args: any[]) => void) => (...args: any[]) => {
      const text = args.map((a) => (typeof a === "string" ? a : a?.message || "")).join(" ");
      if (
        (text.includes("hydrat") || text.includes("Hydrat")) &&
        (text.includes("bis_skin_checked") || text.includes("browser extension"))
      ) {
        return;
      }
      orig.apply(console, args);
    };
    console.error = filter(console.error);
    console.warn = filter(console.warn);
  }, []);

  // Global Click Tracker: Captures click origin for 3D flip-zoom card modal animations
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const x = e.clientX, y = e.clientY;
      const w = window.innerWidth || 1, h = window.innerHeight || 1;
      const normX = (x - w / 2) / (w / 2);
      const normY = (y - h / 2) / (h / 2);
      const shiftX = Math.round(normX * 120);
      const shiftY = Math.round(normY * 80);
      const rotX = Math.round(-normY * 16);
      const rotY = Math.round(normX * 16);
      const r = document.documentElement;
      r.style.setProperty("--modal-origin-x", `${((x / w) * 100).toFixed(1)}%`);
      r.style.setProperty("--modal-origin-y", `${((y / h) * 100).toFixed(1)}%`);
      r.style.setProperty("--modal-shift-x", `${shiftX}px`);
      r.style.setProperty("--modal-shift-y", `${shiftY}px`);
      r.style.setProperty("--modal-rot-x", `${rotX}deg`);
      r.style.setProperty("--modal-rot-y", `${rotY}deg`);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, []);

  return null;
}
