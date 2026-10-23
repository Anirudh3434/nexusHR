"use client";

import React, { createContext, useContext } from "react";
import type { Feature } from "@/lib/entitlements";

interface EntitlementsValue {
  plan: string | null;
  features: Feature[];
  /** True once the workspace's plan has loaded. Unknown => treat as full. */
  known: boolean;
  has: (feature: Feature) => boolean;
}

const EntitlementsContext = createContext<EntitlementsValue>({
  plan: null,
  features: [],
  known: false,
  has: () => true,
});

export function EntitlementsProvider({
  plan,
  features,
  known,
  children,
}: {
  plan?: string | null;
  features?: Feature[];
  known: boolean;
  children: React.ReactNode;
}) {
  const featureList = features ?? [];
  const value: EntitlementsValue = {
    plan: plan ?? null,
    features: featureList,
    known,
    // Fail-open while the plan is still loading so entitled/trial users
    // never see a momentary lock on features they actually have.
    has: (feature: Feature) => !known || featureList.includes(feature),
  };
  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsValue {
  return useContext(EntitlementsContext);
}
