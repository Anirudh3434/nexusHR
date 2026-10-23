// Lightweight in-memory sliding-window rate limiter for login attempts.
// Allows 10 attempts per 10 minutes per key (IP+email).
// NOTE: single-instance Map only — does not share state across multiple
// server instances / serverless replicas. Use Redis for distributed limits.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const hits = new Map<string, number[]>();

function prune(key: string, now: number): number[] {
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.set(key, arr);
  return arr;
}

export function loginRateLimitHit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = prune(key, now);
  if (arr.length >= MAX_ATTEMPTS) {
    const oldest = arr[0];
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }
  arr.push(now);
  hits.set(key, arr);
  return { allowed: true, retryAfter: 0 };
}

export function loginRateLimitClear(key: string): void {
  hits.delete(key);
}
