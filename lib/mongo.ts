/**
 * Shared NoSQL-injection helpers.
 *
 * Middleware strips forged x-user-* headers and sets verified ones;
 * use getAuthInfo() from lib/auth-util (returns { userId, role, companyId } | null).
 */

/** Escape a string for safe use inside new RegExp(). Truncates to maxLen. */
export function escapeRegExp(s: string, maxLen = 128): string {
  if (typeof s !== 'string') return '';
  return s.slice(0, maxLen).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Assert a value is a non-empty string (e.g. an id / token).
 * Throws a 400-style Error on failure.
 */
export function assertIdString(v: unknown, name: string): asserts v is string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    const err = new Error(`${name} must be a non-empty string`) as Error & {
      status?: number;
      statusCode?: number;
    };
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }
}

/** Detect top-level $-prefixed operator keys (e.g. { $ne: ... }). */
export function hasOperatorKeys(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.keys(obj as Record<string, unknown>).some((k) => k.startsWith('$'));
}
