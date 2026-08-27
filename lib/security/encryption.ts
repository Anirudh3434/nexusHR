import crypto from 'crypto';

// Master Encryption Key - Derives a 32-byte (256-bit) buffer key
const RAW_KEY = process.env.APP_ENCRYPTION_KEY || process.env.CREDENTIAL_ENCRYPTION_KEY || 'nexushr-enterprise-master-sec-key-32b';
const MASTER_KEY = crypto.createHash('sha256').update(String(RAW_KEY)).digest();
const BLIND_INDEX_SALT = crypto.createHash('sha256').update(String(RAW_KEY) + '-blind-index-salt').digest();

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const LEGACY_ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a plaintext string using AES-256-GCM (Authenticated Encryption)
 * Output Format: "iv:authTag:encryptedHex"
 */
export const encrypt = (text: string | null | undefined): string => {
  if (!text || typeof text !== 'string') return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts ciphertext with authentication verification
 * Supports both AES-256-GCM ("iv:authTag:encrypted") and legacy AES-256-CBC ("iv:encrypted")
 */
export const decrypt = (encryptedPayload: string | null | undefined): string => {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return '';

  try {
    const parts = encryptedPayload.split(':');

    // 1. AES-256-GCM format (3 parts: iv, authTag, encrypted)
    if (parts.length === 3) {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedHex = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // 2. Legacy AES-256-CBC format (2 parts: iv, encrypted)
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedHex = parts[1];

      const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, MASTER_KEY, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    return encryptedPayload;
  } catch (error) {
    console.error('Decryption failed for payload:', error);
    return '[Encrypted Data - Decryption Failed]';
  }
};

/**
 * Encrypts an arbitrary object or data structure into a single ciphertext string
 */
export const encryptObject = <T>(obj: T): string => {
  if (!obj) return '';
  const jsonStr = JSON.stringify(obj);
  return encrypt(jsonStr);
};

/**
 * Decrypts an encrypted payload back into a strongly-typed object
 */
export const decryptObject = <T>(encryptedPayload: string | null | undefined): T | null => {
  if (!encryptedPayload) return null;
  const decryptedStr = decrypt(encryptedPayload);
  if (!decryptedStr || decryptedStr.startsWith('[Encrypted Data')) return null;

  try {
    return JSON.parse(decryptedStr) as T;
  } catch (err) {
    console.error('Failed to parse decrypted object JSON:', err);
    return null;
  }
};

/**
 * Generates a deterministic one-way blind index (HMAC-SHA256)
 * Allows fast, indexed searches on encrypted fields without exposing plaintext
 */
export const generateBlindIndex = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase().replace(/[\s-]/g, '');
  return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(normalized).digest('hex');
};

// ==========================================
// Masking Utilities for UI & Safe Responses
// ==========================================

/**
 * Masks Bank Account Numbers: "••••••••1234"
 */
export const maskAccountNumber = (accountNumber: string | null | undefined): string => {
  if (!accountNumber) return '';
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return '••••' + trimmed;
  return '••••••••' + trimmed.slice(-4);
};

/**
 * Masks PAN Numbers: "•••••1234A"
 */
export const maskPanNumber = (pan: string | null | undefined): string => {
  if (!pan) return '';
  const trimmed = pan.trim().toUpperCase();
  if (trimmed.length < 5) return '••••••••';
  return '•••••' + trimmed.slice(-5);
};

/**
 * Masks Aadhaar / National ID: "•••• •••• 1234"
 */
export const maskAadhaar = (aadhaar: string | null | undefined): string => {
  if (!aadhaar) return '';
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length < 4) return '•••• •••• ••••';
  return '•••• •••• ' + digits.slice(-4);
};

/**
 * Generic masking helper: "••••••••"
 */
export const maskGeneric = (value: string | null | undefined, visibleEndChars: number = 0): string => {
  if (!value) return '';
  if (visibleEndChars <= 0 || value.length <= visibleEndChars) return '••••••••';
  return '••••••••' + value.slice(-visibleEndChars);
};

// ==========================================
// Strongly-Typed Crucial Data Interfaces
// ==========================================

export interface IEncryptedBankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
  upiId?: string;
  branchName?: string;
}

export interface IEncryptedGovernmentId {
  panNumber?: string;
  aadhaarNumber?: string;
  passportNumber?: string;
  taxIdentificationNumber?: string;
}

export interface IEncryptedPaymentTransaction {
  transactionReference: string;
  utrNumber?: string;
  paymentGateway?: string;
  recipientAccountMasked?: string;
  paymentMethod: 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'cash';
  rawResponseSnapshot?: any;
}
