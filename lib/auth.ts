import jwt from "jsonwebtoken";

/**
 * Central authentication core (Node runtime only — API routes and
 * server utilities. Middleware uses `jose` instead; see middleware.ts).
 *
 * Identity rule: the ONLY trusted identity is a JWT signed with
 * JWT_SECRET, delivered via the HttpOnly `nexushr_session` cookie
 * (web) or an `Authorization: Bearer` token (mobile). Client-supplied
 * `x-user-*` headers are stripped by middleware unless it verified a
 * session itself — never trust them from anywhere else.
 */

export const SESSION_COOKIE = "nexushr_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day

export interface SessionPayload {
  id: string;
  role: string;
  companyId?: string;
  email?: string;
  name?: string;
  isCandidate?: boolean;
  mustChangePassword?: boolean;
  tv?: number;
  /**
   * Effective permission map for the user (module -> permissions),
   * snapshotted at sign-in from defaults + company role overrides + the
   * user's individual overrides. Middleware enforces route gating from this
   * claim (edge-safe, no DB). Takes effect on next sign-in after the
   * Permission Manager saves changes (same behavior as role changes today).
   */
  perms?: Record<string, string[]>;
  /** Subscription plan id snapshotted at sign-in (see lib/entitlements.ts). */
  plan?: string;
  /**
   * Product features unlocked by the plan/status at sign-in. Middleware
   * gates PMS/AI/payroll routes from this claim (edge-safe, no DB).
   * Absent = legacy token = unrestricted until next sign-in.
   */
  features?: string[];
}

/** Fail closed: no fallback secret, ever. Lazy so builds don't crash. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens. Set JWT_SECRET in .env.local (generate with: openssl rand -base64 32)."
    );
  }
  if (secret.length < 16) {
    throw new Error("JWT_SECRET is too short. Use at least 16 characters (generate with: openssl rand -base64 32).");
  }
  return secret;
}

export function signSession(payload: SessionPayload, expiresIn: string = "1d"): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

/** Returns the verified payload, or null when missing/invalid/expired. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
    if (!decoded || typeof decoded !== "object" || typeof decoded.id !== "string" || !decoded.id) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/**
 * Cookie domain for a portable session: one sign-in works on the root
 * domain and every company subdomain. Explicit SESSION_COOKIE_DOMAIN wins.
 * localhost keeps host-only cookies (browsers handle Domain=localhost
 * inconsistently), so dev subdomains stay separate login islands.
 */
export function getSessionCookieDomain(host: string | null): string | undefined {
  const override = process.env.SESSION_COOKIE_DOMAIN;
  if (override) return override;
  const hostname = (host || "").split(":")[0].toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined;
  }
  const parts = hostname.split(".");
  if (parts.length < 2) return undefined;
  return "." + parts.slice(-2).join(".");
}

export function hasRole(role: string | undefined, allowed: string[]): boolean {
  return !!role && allowed.includes(role);
}
