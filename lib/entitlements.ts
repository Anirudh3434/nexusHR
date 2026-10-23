/**
 * Plan entitlements — the single source of truth for which product
 * features a subscription plan unlocks. Edge-safe (no Node/DB imports)
 * so middleware.ts can enforce it from the session claim without a DB read.
 *
 * Features gate whole product areas:
 *   - payroll: payroll runs, payslips, statutory compliance
 *   - pms:     projects, tasks, sprints, project docs/creds/resources, GitHub
 *   - ai:      Performance AI, HR Knowledge Base, Retention Analytics,
 *              Report Builder, LinkedIn gen, NexusAI agent/voice/query
 *
 * Trial workspaces get every feature. Expired workspaces get none. A
 * session with no `features` claim (legacy token) is treated as
 * unrestricted until the next sign-in (fail-open, matching the
 * permission-snapshot rollout behavior).
 */

export type Feature = "payroll" | "pms" | "ai";

export const ALL_FEATURES: Feature[] = ["payroll", "pms", "ai"];

export interface PlanDefinition {
  id: string;
  name: string;
  features: Feature[];
  /** Included PMS seats; -1 = unlimited (org-wide). */
  pmsSeats: number;
  /** Included AI seats; -1 = unlimited (org-wide). */
  aiSeats: number;
}

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  free: { id: "free", name: "Free", features: [], pmsSeats: 0, aiSeats: 0 },
  starter: { id: "starter", name: "Starter", features: [], pmsSeats: 0, aiSeats: 0 },
  growth: { id: "growth", name: "Growth", features: ["payroll", "pms", "ai"], pmsSeats: 3, aiSeats: 2 },
  business: { id: "business", name: "Business", features: ["payroll", "pms", "ai"], pmsSeats: 10, aiSeats: 5 },
  complete: { id: "complete", name: "Complete", features: ["payroll", "pms", "ai"], pmsSeats: -1, aiSeats: -1 },
  enterprise: { id: "enterprise", name: "Enterprise", features: ["payroll", "pms", "ai"], pmsSeats: -1, aiSeats: -1 },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  payroll: "Payroll",
  pms: "Project Management",
  ai: "AI & Analytics",
};

export function isFeature(value: unknown): value is Feature {
  return value === "payroll" || value === "pms" || value === "ai";
}

/** Keep only known feature strings from an untrusted claim array. */
export function coerceFeatures(value: unknown): Feature[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isFeature);
}

/**
 * Resolve the effective feature set for a workspace from its plan + status.
 * `platform` is the footprint-less super-admin scope (full access).
 */
export function resolveFeatures(
  plan: string | null | undefined,
  status: string | null | undefined
): Feature[] {
  if (plan === "platform") return [...ALL_FEATURES];
  if (status === "expired") return [];
  if (status === "trial") return [...ALL_FEATURES];
  if (!plan) return [];
  return PLAN_DEFINITIONS[plan] ? [...PLAN_DEFINITIONS[plan].features] : [];
}

export function hasFeature(
  features: readonly string[] | null | undefined,
  feature: Feature
): boolean {
  return !!features && features.includes(feature);
}

// ── Path → feature resolution ───────────────────────────────────────────
// Prefixes are matched with startsWith over controlled route trees. AI
// prefixes are checked first so `/api/tasks/ai-*` resolves to `ai`, not `pms`.

const FEATURE_API_PREFIXES: { feature: Feature; prefixes: string[] }[] = [
  {
    feature: "ai",
    prefixes: [
      "/api/ai/",
      "/api/analysis/",
      "/api/analytics/retention",
      "/api/reports/",
      "/api/generate-linkedin-post",
      "/api/tasks/ai-",
    ],
  },
  { feature: "payroll", prefixes: ["/api/payroll"] },
  {
    feature: "pms",
    prefixes: [
      "/api/projects",
      "/api/tasks",
      "/api/sprints",
      "/api/backlog",
      "/api/time-logs",
      "/api/project-",
      "/api/github",
      "/api/webhooks/github",
      "/api/version-snapshots",
    ],
  },
];

const FEATURE_PAGE_PREFIXES: { feature: Feature; prefixes: string[] }[] = [
  {
    feature: "ai",
    prefixes: [
      "/reports/performance",
      "/hr-knowledge-base",
      "/retention-analytics",
      "/reports-analytics",
    ],
  },
  { feature: "payroll", prefixes: ["/payroll", "/payslips"] },
  { feature: "pms", prefixes: ["/projects", "/my-projects", "/tasks", "/my-tasks", "/sprints"] },
];

/** Which feature (if any) a page or API path belongs to. */
export function featureForPath(pathname: string): Feature | null {
  const table = pathname.startsWith("/api/") ? FEATURE_API_PREFIXES : FEATURE_PAGE_PREFIXES;
  for (const { feature, prefixes } of table) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
      return feature;
    }
  }
  return null;
}
