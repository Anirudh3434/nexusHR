import * as crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { decrypt } from '@/lib/security/encryption';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9 _-]{4,36}$/;
const PAYOUT_MODES = ['IMPS', 'NEFT', 'RTGS', 'UPI'] as const;

export type PayoutMode = (typeof PAYOUT_MODES)[number];

export interface RazorpayXResolvedConfig {
  keyId: string;
  keySecret: string;
  accountNumber: string;
  webhookSecret?: string;
  defaultMode: PayoutMode;
  isMock: boolean;
  source: 'company' | 'env' | 'mock';
}

export interface PayoutBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  upiId?: string;
}

export interface PayoutEmployeeDetails {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface CreatePayoutParams {
  companyId: string;
  payrollId: string;
  employee: PayoutEmployeeDetails;
  bankDetails: PayoutBankDetails;
  amountInRupees: number;
  month: number;
  year: number;
  mode?: PayoutMode;
  narration?: string;
  /** Reuse a cached Razorpay fund account instead of re-creating contact + fund account. */
  fundAccountId?: string;
  /** Caller-provided idempotency key (4-36 chars). A UUIDv4 is generated when absent/invalid. */
  idempotencyKey?: string;
}

export interface PayoutStatusDetails {
  description?: string;
  reason?: string;
  source?: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  payoutStatus?: string; // 'pending' | 'queued' | 'scheduled' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected' | 'failed'
  utr?: string;
  mode?: string;
  fee?: number;
  tax?: number;
  fundAccountId?: string;
  idempotencyKey?: string;
  statusDetails?: PayoutStatusDetails;
  /** True when the outcome is unknown (network error / 5xx after retries). Retry with the same idempotency key. */
  ambiguous?: boolean;
  error?: string;
  raw?: Record<string, unknown>;
}

interface RazorpayPayoutResponse {
  id?: string;
  status?: string;
  utr?: string | null;
  mode?: string;
  fees?: number;
  tax?: number;
  fund_account_id?: string;
  fund_account?: {
    id?: string;
  };
  status_details?: PayoutStatusDetails | null;
  error?: {
    description?: string;
    message?: string;
  };
  [key: string]: unknown;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Razorpay allows names with a limited character set and a minimum length.
 * Returns an empty string when the value cannot be made valid.
 */
function sanitizePersonName(value: string | undefined, minLength: number, maxLength: number): string {
  let name = (value || '')
    .replace(/[^a-zA-Z0-9 ’_/().\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[’_/()\-]+$/g, '')
    .trim();

  if (name.length > maxLength) {
    name = name.slice(0, maxLength).trim().replace(/[’_/()\-]+$/g, '').trim();
  }

  return name.length >= minLength ? name : '';
}

function sanitizeNarration(value: string, fallback: string): string {
  const narration = value
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);

  return narration || fallback;
}

function validateIfsc(value: string | undefined): string | null {
  const ifsc = (value || '').trim().toUpperCase();
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? ifsc : null;
}

function validateAccountNumber(value: string | undefined): string | null {
  const accountNumber = (value || '').trim();
  return /^[A-Za-z0-9]{5,35}$/.test(accountNumber) ? accountNumber : null;
}

function validateUpiId(value: string | undefined): string | null {
  const upiId = (value || '').trim();
  if (upiId.length < 3 || upiId.length > 100) return null;
  return /^[A-Za-z0-9.\-]+@[A-Za-z0-9.\-]+$/.test(upiId) ? upiId : null;
}

/**
 * Resolves RazorpayX credentials from Company settings or Environment variables.
 *
 * Multi-tenant safety: when a `companyId` is supplied, environment credentials are
 * NOT used unless `RAZORPAYX_ALLOW_ENV_FALLBACK=true` is explicitly set. This prevents
 * a tenant with a disabled/incomplete config from silently paying from the platform account.
 */
export async function getRazorpayXConfig(companyId?: string): Promise<RazorpayXResolvedConfig | null> {
  // 1. Try company-level config first
  if (companyId) {
    try {
      await connectDB();
      const company = await Company.findById(companyId).select('razorpayxConfig');
      const cfg = company?.razorpayxConfig;

      if (cfg && cfg.enabled && cfg.keyId && cfg.keySecretEncrypted && cfg.accountNumber) {
        const secret = decrypt(cfg.keySecretEncrypted);

        let webhookSecret = cfg.webhookSecret || process.env.RAZORPAYX_WEBHOOK_SECRET;
        if (cfg.webhookSecretEncrypted) {
          try {
            webhookSecret = decrypt(cfg.webhookSecretEncrypted);
          } catch (err) {
            console.error('[RazorpayX] Failed to decrypt webhook secret:', err);
          }
        }

        const accountNumber = cfg.accountNumber;
        const defaultMode = PAYOUT_MODES.includes(cfg.defaultMode as PayoutMode)
          ? (cfg.defaultMode as PayoutMode)
          : 'IMPS';

        if (cfg.keyId && secret && accountNumber) {
          return {
            keyId: cfg.keyId,
            keySecret: secret,
            accountNumber,
            webhookSecret,
            defaultMode,
            isMock: false,
            source: 'company',
          };
        }
      }
    } catch (err) {
      console.error('[RazorpayX] Error loading company config:', err);
    }
  }

  // 2. Environment fallback. Disabled for tenant-scoped calls unless explicitly allowed.
  const canUseEnv = !companyId || process.env.RAZORPAYX_ALLOW_ENV_FALLBACK === 'true';
  const envKeyId = process.env.RAZORPAYX_KEY_ID;
  const envKeySecret = process.env.RAZORPAYX_KEY_SECRET;
  const envAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;

  if (canUseEnv && envKeyId && envKeySecret && envAccount) {
    return {
      keyId: envKeyId,
      keySecret: envKeySecret,
      accountNumber: envAccount,
      webhookSecret: process.env.RAZORPAYX_WEBHOOK_SECRET,
      defaultMode: 'IMPS',
      isMock: false,
      source: 'env',
    };
  }

  // 3. Mock mode if explicitly allowed or testing
  if (process.env.RAZORPAYX_MOCK === 'true' || process.env.NODE_ENV === 'test') {
    return {
      keyId: 'rzp_mock_nexus_key',
      keySecret: 'mock_nexus_secret',
      accountNumber: '7878780080316316',
      webhookSecret: 'mock_webhook_secret',
      defaultMode: 'IMPS',
      isMock: true,
      source: 'mock',
    };
  }

  return null;
}

/**
 * Creates and executes a payout in RazorpayX using the composite payout API,
 * or a cached fund account when `fundAccountId` is supplied.
 */
export async function createRazorpayXPayout(params: CreatePayoutParams): Promise<PayoutResult> {
  const config = await getRazorpayXConfig(params.companyId);

  if (!config) {
    return {
      success: false,
      error: 'RazorpayX is not configured. Please add your RazorpayX Key ID, Secret, and Account Number in Payroll Settings or environment variables.',
    };
  }

  const {
    employee,
    bankDetails,
    amountInRupees,
    payrollId,
    month,
    year,
    narration,
  } = params;

  if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
    return {
      success: false,
      error: 'Salary amount must be greater than zero.',
    };
  }

  const amountInPaise = Math.round(amountInRupees * 100);
  if (amountInPaise < 100) {
    return {
      success: false,
      error: 'Salary amount must be at least ₹1.00 (100 paise) for a RazorpayX payout.',
    };
  }

  // Choose payout mode
  const requestedMode = params.mode || config.defaultMode || 'IMPS';
  if (!PAYOUT_MODES.includes(requestedMode as PayoutMode)) {
    return {
      success: false,
      error: `Unsupported RazorpayX payout mode: ${requestedMode}.`,
    };
  }
  const mode = requestedMode as PayoutMode;

  // Idempotency keys are mandatory (since 15 March 2025) and must be 4-36 chars.
  const requestedKey = params.idempotencyKey?.trim();
  const idempotencyKey =
    requestedKey && IDEMPOTENCY_KEY_PATTERN.test(requestedKey)
      ? requestedKey
      : crypto.randomUUID();

  // In mock mode, simulate immediate successful processing
  if (config.isMock) {
    const mockPayoutId = `pout_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const mockUtr = `UTR${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      payoutId: mockPayoutId,
      payoutStatus: 'processed',
      utr: mockUtr,
      mode,
      fee: 5,
      tax: 0.9,
      idempotencyKey,
      fundAccountId: params.fundAccountId,
      raw: { id: mockPayoutId, status: 'processed', utr: mockUtr, mock: true },
    };
  }

  // Normalize phone number (must be 10 digits in India if present)
  let cleanPhone = employee.phone ? employee.phone.replace(/\D/g, '') : '';
  if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
  if (cleanPhone.length < 10) cleanPhone = '';

  const contactName = sanitizePersonName(employee.name, 3, 50) || 'Employee User';
  const cleanEmail = employee.email?.trim() || undefined;

  // Build fund account composite object only when we do not have a cached fund account id.
  let fundAccountPayload: Record<string, unknown> | null = null;

  if (!params.fundAccountId) {
    if (mode === 'UPI') {
      const vpa = validateUpiId(bankDetails.upiId);
      if (!vpa) {
        return {
          success: false,
          error: `Employee ${contactName} has no valid UPI ID configured for UPI payout.`,
          idempotencyKey,
        };
      }
      fundAccountPayload = {
        account_type: 'vpa',
        vpa: {
          address: vpa,
        },
        contact: {
          name: contactName,
          email: cleanEmail,
          contact: cleanPhone || undefined,
          type: 'employee',
          reference_id: `EMP_${employee._id}`,
        },
      };
    } else {
      const accountNumber = validateAccountNumber(bankDetails.accountNumber);
      if (!accountNumber) {
        return {
          success: false,
          error: `Employee ${contactName} has an invalid bank account number (must be 5-35 alphanumeric characters).`,
          idempotencyKey,
        };
      }

      const ifsc = validateIfsc(bankDetails.ifscCode);
      if (!ifsc) {
        return {
          success: false,
          error: `Employee ${contactName} has an invalid IFSC code (expected 11 characters, e.g. HDFC0001234).`,
          idempotencyKey,
        };
      }

      const holderName = sanitizePersonName(
        bankDetails.accountHolderName || contactName,
        4,
        120
      );
      if (!holderName) {
        return {
          success: false,
          error: `Employee ${contactName} has an invalid account holder name for RazorpayX.`,
          idempotencyKey,
        };
      }

      fundAccountPayload = {
        account_type: 'bank_account',
        bank_account: {
          name: holderName,
          ifsc,
          account_number: accountNumber,
        },
        contact: {
          name: contactName,
          email: cleanEmail,
          contact: cleanPhone || undefined,
          type: 'employee',
          reference_id: `EMP_${employee._id}`,
        },
      };
    }
  }

  const monthLabel = MONTH_NAMES[month] || `M${month + 1}`;
  const defaultNarration = sanitizeNarration(`Salary ${monthLabel} ${year}`, 'Salary payout');
  const payoutNarration = sanitizeNarration(narration || defaultNarration, defaultNarration);
  const referenceId = buildPayoutReferenceId(payrollId, month, year);

  const payload: Record<string, unknown> = {
    account_number: config.accountNumber,
    amount: amountInPaise,
    currency: 'INR',
    mode,
    purpose: 'salary',
    queue_if_low_balance: true,
    reference_id: referenceId,
    narration: payoutNarration,
    notes: {
      payrollId,
      employeeId: employee._id,
      month: String(month),
      year: String(year),
      platform: 'NexusHR',
    },
  };

  if (params.fundAccountId) {
    payload.fund_account_id = params.fundAccountId;
  } else {
    payload.fund_account = fundAccountPayload;
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  const MAX_ATTEMPTS = 3;
  let lastError = 'Failed to process payout via RazorpayX';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${RAZORPAY_API_BASE}/payouts`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'X-Payout-Idempotency': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: Record<string, unknown> = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          data = {};
        }
      }

      if (res.ok) {
        const responseData = data as RazorpayPayoutResponse;
        if (!responseData.id) {
          return {
            success: false,
            error: 'RazorpayX returned an unexpected response (missing payout id).',
            raw: data,
            idempotencyKey,
            ambiguous: false,
          };
        }
        const statusDetails = responseData.status_details
          ? {
              description: responseData.status_details.description,
              reason: responseData.status_details.reason,
              source: responseData.status_details.source,
            }
          : undefined;

        return {
          success: true,
          payoutId: responseData.id,
          payoutStatus: responseData.status,
          utr: responseData.utr || undefined,
          mode: responseData.mode || mode,
          // Razorpay returns `fees` (plural) and `tax`.
          fee: responseData.fees ? responseData.fees / 100 : 0,
          tax: responseData.tax ? responseData.tax / 100 : 0,
          fundAccountId: responseData.fund_account_id || responseData.fund_account?.id || params.fundAccountId,
          idempotencyKey,
          statusDetails,
          raw: data,
        };
      }

      const errorData = data as RazorpayPayoutResponse;
      lastError =
        errorData?.error?.description ||
        errorData?.error?.message ||
        `RazorpayX HTTP ${res.status}`;

      // Retry transient server/rate-limit errors with the SAME idempotency key.
      if ((res.status >= 500 || res.status === 429) && attempt < MAX_ATTEMPTS) {
        await sleep(300 * attempt);
        continue;
      }

      return {
        success: false,
        error: lastError,
        raw: data,
        idempotencyKey,
        ambiguous: res.status >= 500 || res.status === 429,
      };
    } catch (err: unknown) {
      console.error(`[RazorpayX] Payout request error (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
      lastError = err instanceof Error ? err.message : 'Network error communicating with RazorpayX';

      if (attempt < MAX_ATTEMPTS) {
        await sleep(300 * attempt);
        continue;
      }

      // Outcome unknown: the payout may have been accepted. Reuse the key on retry.
      return {
        success: false,
        error: lastError,
        idempotencyKey,
        ambiguous: true,
      };
    }
  }

  return {
    success: false,
    error: lastError,
    idempotencyKey,
    ambiguous: true,
  };
}

/**
 * Resolves the webhook secret for a company. This intentionally does not depend on
 * payouts being enabled so existing payouts can still be reconciled after the toggle is off.
 */
export async function getRazorpayXWebhookSecret(companyId?: string): Promise<string | null> {
  if (companyId) {
    try {
      await connectDB();
      const company = await Company.findById(companyId).select('razorpayxConfig');
      const cfg = company?.razorpayxConfig;

      if (cfg?.webhookSecretEncrypted) {
        try {
          return decrypt(cfg.webhookSecretEncrypted);
        } catch (err) {
          console.error('[RazorpayX] Failed to decrypt webhook secret:', err);
          return null;
        }
      }
      if (cfg?.webhookSecret) return cfg.webhookSecret;

      // The company has its own RazorpayX credentials but no webhook secret.
      // Fail closed instead of validating against a platform-wide secret.
      if (cfg?.keyId) return null;
    } catch (err) {
      console.error('[RazorpayX] Error loading webhook secret:', err);
    }
  }

  if (process.env.RAZORPAYX_WEBHOOK_SECRET) {
    return process.env.RAZORPAYX_WEBHOOK_SECRET;
  }
  if (process.env.RAZORPAYX_MOCK === 'true' || process.env.NODE_ENV === 'test') {
    return 'mock_webhook_secret';
  }
  return null;
}

/**
 * Builds the Razorpay `reference_id` used for a payroll payout. Deterministic so a
 * previous attempt can be reconciled by reference when its outcome is unknown.
 */
export function buildPayoutReferenceId(payrollId: string, month: number, year: number): string {
  return `PAY_${payrollId.slice(-8)}_${month}_${year}`.slice(0, 40);
}

/**
 * Looks up existing payouts by `reference_id`. Used to reconcile an attempt whose
 * response was lost before creating a second payout for the same payroll.
 */
export async function findRazorpayXPayoutsByReference(
  referenceId: string,
  companyId?: string
): Promise<PayoutResult[]> {
  const config = await getRazorpayXConfig(companyId);
  if (!config || config.isMock) return [];

  const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

  try {
    const res = await fetch(
      `${RAZORPAY_API_BASE}/payouts?reference_id=${encodeURIComponent(referenceId)}&count=10`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as { items?: RazorpayPayoutResponse[] };
    const items = Array.isArray(data.items) ? data.items : [];

    return items
      .filter((item) => Boolean(item.id))
      .map((item) => ({
        success: true,
        payoutId: item.id,
        payoutStatus: item.status,
        utr: item.utr || undefined,
        mode: item.mode,
        fee: item.fees ? item.fees / 100 : 0,
        tax: item.tax ? item.tax / 100 : 0,
        fundAccountId: item.fund_account_id || item.fund_account?.id,
        statusDetails: item.status_details || undefined,
        raw: item as Record<string, unknown>,
      }));
  } catch (err) {
    console.error('[RazorpayX] Failed to look up payouts by reference:', err);
    return [];
  }
}

/**
 * Fetches payout details and latest status from RazorpayX API.
 */
export async function getRazorpayXPayoutDetails(payoutId: string, companyId?: string): Promise<PayoutResult> {
  const config = await getRazorpayXConfig(companyId);

  if (!config) {
    return {
      success: false,
      error: 'RazorpayX configuration not found.',
    };
  }

  if (config.isMock || payoutId.startsWith('pout_mock_')) {
    return {
      success: true,
      payoutId,
      payoutStatus: 'processed',
      utr: `UTR_MOCK_${Date.now()}`,
      mode: 'IMPS',
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

  try {
    const res = await fetch(`${RAZORPAY_API_BASE}/payouts/${encodeURIComponent(payoutId)}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await res.text();
    let data: RazorpayPayoutResponse = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText) as RazorpayPayoutResponse;
      } catch {
        data = {};
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.error?.description || `HTTP ${res.status}`,
        raw: data,
      };
    }

    const statusDetails = data.status_details
      ? {
          description: data.status_details.description,
          reason: data.status_details.reason,
          source: data.status_details.source,
        }
      : undefined;

    return {
      success: true,
      payoutId: data.id,
      payoutStatus: data.status,
      utr: data.utr || undefined,
      mode: data.mode,
      fee: data.fees ? data.fees / 100 : 0,
      tax: data.tax ? data.tax / 100 : 0,
      fundAccountId: data.fund_account_id || data.fund_account?.id,
      statusDetails,
      raw: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payout status from RazorpayX';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Tests authentication against RazorpayX with given or resolved credentials.
 * Note: this checks API credentials only. `accountNumberFormatValid` is a local
 * format check, not a Razorpay-side validation of the source account.
 */
export async function testRazorpayXConnection(
  credentials?: { keyId: string; keySecret: string; accountNumber?: string },
  companyId?: string
): Promise<{
  success: boolean;
  message: string;
  credentialsValid?: boolean;
  accountNumberFormatValid?: boolean;
}> {
  let keyId = credentials?.keyId;
  let keySecret = credentials?.keySecret;
  let accountNumber = credentials?.accountNumber;

  if (!keyId || !keySecret) {
    const resolved = await getRazorpayXConfig(companyId);
    if (!resolved) {
      return { success: false, message: 'No RazorpayX credentials configured to test.' };
    }
    keyId = resolved.keyId;
    keySecret = resolved.keySecret;
    accountNumber = resolved.accountNumber;
  }

  const accountNumberFormatValid = accountNumber
    ? /^[A-Za-z0-9]{6,35}$/.test(accountNumber.trim())
    : undefined;

  if (keyId.includes('mock')) {
    return {
      success: true,
      message: 'RazorpayX mock connection verified successfully.',
      credentialsValid: true,
      accountNumberFormatValid,
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    // Check contacts endpoint (lightweight GET)
    const res = await fetch(`${RAZORPAY_API_BASE}/contacts?count=1`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      return {
        success: true,
        message:
          accountNumberFormatValid === false
            ? 'Authenticated with RazorpayX, but the source account number format looks invalid.'
            : 'Successfully authenticated with the RazorpayX API.',
        credentialsValid: true,
        accountNumberFormatValid,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      message: data?.error?.description || `Connection failed with status ${res.status}`,
      credentialsValid: false,
      accountNumberFormatValid,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not reach RazorpayX API server.';
    return {
      success: false,
      message: msg,
      credentialsValid: false,
      accountNumberFormatValid,
    };
  }
}

/**
 * Verifies RazorpayX webhook signature (HMAC-SHA256 of the raw request body).
 */
export function verifyRazorpayXWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const received = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(received, expected);
  } catch (err) {
    console.error('[RazorpayX Webhook] Signature verification error:', err);
    return false;
  }
}
