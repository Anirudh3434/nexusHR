import crypto from 'crypto';
import { getJwtSecret } from './auth';

export interface OAuthStatePayload {
  companyId: string;
  userId: string;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function b64urlEncode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function b64urlDecode(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

/** HMAC-SHA256 signed, 10-min expiring OAuth state with random nonce. */
export function signState(payload: OAuthStatePayload): string {
  const body = JSON.stringify({
    companyId: payload.companyId,
    userId: payload.userId,
    exp: Date.now() + STATE_TTL_MS,
    nonce: crypto.randomBytes(16).toString('hex'),
  });
  const encoded = b64urlEncode(body);
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/** Returns the payload when signature + expiry are valid, else null. */
export function verifyState(state: string | null | undefined): OAuthStatePayload | null {
  if (!state || typeof state !== 'string') return null;
  try {
    const [encoded, sig] = state.split('.');
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', getJwtSecret()).update(encoded).digest('base64url');
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(b64urlDecode(encoded));
    if (!parsed || typeof parsed.companyId !== 'string' || typeof parsed.userId !== 'string') return null;
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null;
    return { companyId: parsed.companyId, userId: parsed.userId };
  } catch {
    return null;
  }
}
