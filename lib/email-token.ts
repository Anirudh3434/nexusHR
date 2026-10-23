import { encrypt, decrypt } from './security/encryption';

/** Encrypt an OAuth token for storage. */
export function encryptToken(v: string | null | undefined): string {
  if (!v || typeof v !== 'string') return '';
  return encrypt(v);
}

/**
 * Migration-tolerant decrypt: tries decrypt(); if the value is a legacy
 * raw (plaintext) token — no encrypted envelope — or decrypt yields the
 * failure sentinel / empty, returns the original value unchanged.
 */
export function decryptToken(v: string | null | undefined): string {
  if (!v || typeof v !== 'string') return '';
  if (!v.includes(':')) return v; // legacy raw token, never encrypted
  try {
    const d = decrypt(v);
    if (!d || d === '' || d.startsWith('[Encrypted Data')) return v;
    return d;
  } catch {
    return v;
  }
}
