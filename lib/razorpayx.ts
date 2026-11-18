import * as crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { decrypt } from '@/lib/security/encryption';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayXResolvedConfig {
  keyId: string;
  keySecret: string;
  accountNumber: string;
  webhookSecret?: string;
  defaultMode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
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
  mode?: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
  narration?: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  payoutStatus?: string; // 'queued' | 'pending' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected'
  utr?: string;
  mode?: string;
  fee?: number;
  tax?: number;
  error?: string;
  raw?: Record<string, unknown>;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Resolves RazorpayX credentials from Company settings or Environment variables.
 */
export async function getRazorpayXConfig(companyId?: string): Promise<RazorpayXResolvedConfig | null> {
  // 1. Try company-level config first
  if (companyId) {
    try {
      await connectDB();
      const company = await Company.findById(companyId).select('razorpayxConfig');
      const cfg = company?.razorpayxConfig;

      if (cfg && cfg.enabled && cfg.keyId && (cfg.keySecretEncrypted || process.env.RAZORPAYX_KEY_SECRET)) {
        let secret = '';
        if (cfg.keySecretEncrypted) {
          secret = decrypt(cfg.keySecretEncrypted);
        } else if (process.env.RAZORPAYX_KEY_SECRET) {
          secret = process.env.RAZORPAYX_KEY_SECRET;
        }

        const accountNumber = cfg.accountNumber || process.env.RAZORPAYX_ACCOUNT_NUMBER;
        if (cfg.keyId && secret && accountNumber) {
          return {
            keyId: cfg.keyId,
            keySecret: secret,
            accountNumber,
            webhookSecret: cfg.webhookSecret || process.env.RAZORPAYX_WEBHOOK_SECRET,
            defaultMode: cfg.defaultMode || 'IMPS',
            isMock: false,
            source: 'company',
          };
        }
      }
    } catch (err) {
      console.error('[RazorpayX] Error loading company config:', err);
    }
  }

  // 2. Try environment variables fallback
  const envKeyId = process.env.RAZORPAYX_KEY_ID;
  const envKeySecret = process.env.RAZORPAYX_KEY_SECRET;
  const envAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;

  if (envKeyId && envKeySecret && envAccount) {
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
 * Creates and executes a payout in RazorpayX using the composite payout API.
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

  if (amountInRupees <= 0) {
    return {
      success: false,
      error: 'Salary amount must be greater than zero.',
    };
  }

  // Choose payout mode
  const mode = params.mode || config.defaultMode || 'IMPS';

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
      raw: { id: mockPayoutId, status: 'processed', utr: mockUtr, mock: true },
    };
  }

  // Normalize phone number (must be 10 digits in India if present)
  let cleanPhone = employee.phone ? employee.phone.replace(/\D/g, '') : '';
  if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
  if (cleanPhone.length < 10) cleanPhone = '';

  const cleanName = (employee.name || 'Employee').trim();
  const cleanEmail = employee.email?.trim() || undefined;

  // Build fund account composite object
  let fundAccountPayload: Record<string, unknown> | null = null;
  if (mode === 'UPI') {
    if (!bankDetails.upiId) {
      return {
        success: false,
        error: `Employee ${cleanName} has no UPI ID configured for UPI payout.`,
      };
    }
    fundAccountPayload = {
      account_type: 'vpa',
      vpa: {
        address: bankDetails.upiId.trim(),
      },
      contact: {
        name: cleanName,
        email: cleanEmail,
        contact: cleanPhone || undefined,
        type: 'employee',
        reference_id: `EMP_${employee._id}`,
      },
    };
  } else {
    if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
      return {
        success: false,
        error: `Employee ${cleanName} is missing a bank account number or IFSC code.`,
      };
    }
    fundAccountPayload = {
      account_type: 'bank_account',
      bank_account: {
        name: (bankDetails.accountHolderName || cleanName).trim(),
        ifsc: bankDetails.ifscCode.trim().toUpperCase(),
        account_number: bankDetails.accountNumber.trim(),
      },
      contact: {
        name: cleanName,
        email: cleanEmail,
        contact: cleanPhone || undefined,
        type: 'employee',
        reference_id: `EMP_${employee._id}`,
      },
    };
  }

  const monthLabel = MONTH_NAMES[month] || `M${month + 1}`;
  const defaultNarration = `Salary ${monthLabel} ${year}`.slice(0, 30);
  const payoutNarration = (narration || defaultNarration).slice(0, 30);
  const referenceId = `PAY_${payrollId.slice(-8)}_${month}_${year}`.slice(0, 40);
  const amountInPaise = Math.round(amountInRupees * 100);

  const payload = {
    account_number: config.accountNumber,
    fund_account: fundAccountPayload,
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

  const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  const idempotencyKey = `payout_${payrollId}_${month}_${year}_${amountInPaise}`;

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

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.description || data?.error?.message || `RazorpayX HTTP ${res.status}`;
      return {
        success: false,
        error: errorMsg,
        raw: data,
      };
    }

    return {
      success: true,
      payoutId: data.id,
      payoutStatus: data.status, // 'queued' | 'pending' | 'processing' | 'processed' | 'rejected'
      utr: data.utr || undefined,
      mode: data.mode || mode,
      fee: data.fee ? data.fee / 100 : 0,
      tax: data.tax ? data.tax / 100 : 0,
      raw: data,
    };
  } catch (err: unknown) {
    console.error('[RazorpayX] Payout request error:', err);
    const msg = err instanceof Error ? err.message : 'Network error communicating with RazorpayX';
    return {
      success: false,
      error: msg,
    };
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
    const res = await fetch(`${RAZORPAY_API_BASE}/payouts/${payoutId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data?.error?.description || `HTTP ${res.status}`,
        raw: data,
      };
    }

    return {
      success: true,
      payoutId: data.id,
      payoutStatus: data.status,
      utr: data.utr || undefined,
      mode: data.mode,
      fee: data.fee ? data.fee / 100 : 0,
      tax: data.tax ? data.tax / 100 : 0,
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
 * Tests connection to RazorpayX with given or resolved credentials.
 */
export async function testRazorpayXConnection(
  credentials?: { keyId: string; keySecret: string; accountNumber?: string },
  companyId?: string
): Promise<{ success: boolean; message: string; accountNumberValid?: boolean }> {
  let keyId = credentials?.keyId;
  let keySecret = credentials?.keySecret;

  if (!keyId || !keySecret) {
    const resolved = await getRazorpayXConfig(companyId);
    if (!resolved) {
      return { success: false, message: 'No RazorpayX credentials configured to test.' };
    }
    keyId = resolved.keyId;
    keySecret = resolved.keySecret;
  }

  if (keyId.includes('mock')) {
    return {
      success: true,
      message: 'RazorpayX mock connection verified successfully.',
      accountNumberValid: true,
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
        message: 'Successfully connected to RazorpayX API.',
        accountNumberValid: true,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      message: data?.error?.description || `Connection failed with status ${res.status}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not reach RazorpayX API server.';
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Verifies RazorpayX webhook signature.
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

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (err) {
    console.error('[RazorpayX Webhook] Signature verification error:', err);
    return false;
  }
}
