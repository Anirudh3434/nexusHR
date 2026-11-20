import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import Employee from '@/models/Employee';
import BankDetail from '@/models/BankDetail';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { notify } from '@/lib/notify';
import {
  createRazorpayXPayout,
  getRazorpayXPayoutDetails,
  getRazorpayXConfig,
  findRazorpayXPayoutsByReference,
  buildPayoutReferenceId,
  PayoutBankDetails,
  PayoutMode,
  PayoutResult,
  RazorpayXResolvedConfig,
} from '@/lib/razorpayx';
import {
  decryptObject,
  encryptObject,
  maskAccountNumber,
  maskGeneric,
  IEncryptedBankDetails,
} from '@/lib/security/encryption';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAYOUT_MODES: PayoutMode[] = ['IMPS', 'NEFT', 'RTGS', 'UPI'];
const MAX_CONCURRENCY = 5;

interface ResolvedBankDetails extends PayoutBankDetails {
  fundAccountId?: string;
  cachedFingerprint?: string;
  sourceModel: 'BankDetail' | 'Employee';
  sourceId: string;
}

interface PayrollRecordLike {
  _id: string;
  status?: string;
  netSalary?: number;
  month: number;
  year: number;
  companyId?: string | { _id?: string };
  employeeId?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  payoutId?: string;
  payoutStatus?: string;
  utr?: string;
  payoutIdempotencyKey?: string;
  payoutIdempotencyReusable?: boolean;
  payoutIdempotencyFingerprint?: string;
}

function getRecordCompanyId(record: PayrollRecordLike): string {
  const company = record.companyId;
  return String(typeof company === 'object' && company ? company._id : company);
}

interface PayoutItemResult {
  payrollId: string;
  employeeName?: string;
  status: string;
  payoutStatus?: string;
  payoutId?: string;
  utr?: string;
  amount?: number;
  success: boolean;
  error?: string;
}

/**
 * Resolves decrypted bank details for an employee from either BankDetail or Employee model.
 */
async function resolveEmployeeBankDetails(userId: string): Promise<ResolvedBankDetails | null> {
  // 1. Try dedicated BankDetail model first
  const bankRecord = await BankDetail.findOne({ userId });
  if (bankRecord && bankRecord.encryptedDetails) {
    const decrypted = decryptObject<IEncryptedBankDetails>(bankRecord.encryptedDetails);
    if (decrypted && ((decrypted.accountNumber && decrypted.ifscCode) || decrypted.upiId)) {
      return {
        accountHolderName: decrypted.accountHolderName || bankRecord.accountHolderName || '',
        accountNumber: decrypted.accountNumber || '',
        ifscCode: decrypted.ifscCode || '',
        bankName: decrypted.bankName || bankRecord.bankName,
        upiId: decrypted.upiId,
        fundAccountId: bankRecord.razorpayFundAccountId,
        cachedFingerprint: bankRecord.razorpayFundAccountFingerprint,
        sourceModel: 'BankDetail',
        sourceId: String(bankRecord._id),
      };
    }
  }

  // 2. Fall back to Employee model's encryptedBankDetails
  const employeeRecord = await Employee.findOne({ userId });
  if (employeeRecord && employeeRecord.encryptedBankDetails) {
    const decrypted = decryptObject<IEncryptedBankDetails>(employeeRecord.encryptedBankDetails);
    if (decrypted && ((decrypted.accountNumber && decrypted.ifscCode) || decrypted.upiId)) {
      return {
        accountHolderName: decrypted.accountHolderName || '',
        accountNumber: decrypted.accountNumber || '',
        ifscCode: decrypted.ifscCode || '',
        bankName: decrypted.bankName,
        upiId: decrypted.upiId,
        fundAccountId: employeeRecord.razorpayFundAccountId,
        cachedFingerprint: employeeRecord.razorpayFundAccountFingerprint,
        sourceModel: 'Employee',
        sourceId: String(employeeRecord._id),
      };
    }
  }

  return null;
}

function computeBankFingerprint(bank: PayoutBankDetails, mode: PayoutMode): string {
  const raw =
    mode === 'UPI'
      ? `vpa|${(bank.upiId || '').trim().toLowerCase()}`
      : `bank|${(bank.accountNumber || '').trim()}|${(bank.ifscCode || '').trim().toUpperCase()}|${(bank.accountHolderName || '').trim().toLowerCase()}`;

  return createHash('sha256').update(raw).digest('hex');
}

async function cacheFundAccount(
  bank: ResolvedBankDetails,
  fundAccountId: string,
  fingerprint: string
): Promise<void> {
  const update = {
    razorpayFundAccountId: fundAccountId,
    razorpayFundAccountFingerprint: fingerprint,
  };

  if (bank.sourceModel === 'BankDetail') {
    await BankDetail.findByIdAndUpdate(bank.sourceId, update);
  } else {
    await Employee.findByIdAndUpdate(bank.sourceId, update);
  }
}

async function clearCachedFundAccount(bank: ResolvedBankDetails): Promise<void> {
  const unset = {
    $unset: {
      razorpayFundAccountId: 1,
      razorpayFundAccountFingerprint: 1,
    },
  };

  if (bank.sourceModel === 'BankDetail') {
    await BankDetail.findByIdAndUpdate(bank.sourceId, unset);
  } else {
    await Employee.findByIdAndUpdate(bank.sourceId, unset);
  }
}

function mapPayoutStatus(status?: string): 'Paid' | 'Processing' | 'Failed' {
  if (status === 'processed') return 'Paid';
  if (['failed', 'reversed', 'rejected', 'cancelled'].includes(status || '')) return 'Failed';
  return 'Processing';
}

/**
 * Runs async work with a bounded concurrency so large payrolls don't hit request timeouts.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * POST /api/payroll/payout
 * Disburses single or bulk payroll records via RazorpayX.
 */
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { payrollIds, mode, narration } = body;

    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return NextResponse.json({ message: 'Missing payrollIds array' }, { status: 400 });
    }

    if (mode !== undefined && !PAYOUT_MODES.includes(mode)) {
      return NextResponse.json({ message: `Invalid payout mode. Use one of: ${PAYOUT_MODES.join(', ')}` }, { status: 400 });
    }

    const isSuperAdmin = auth.role === 'super_admin';
    const companyId = auth.companyId;

    if (!companyId && !isSuperAdmin) {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }

    const query: Record<string, unknown> = { _id: { $in: payrollIds } };
    if (!isSuperAdmin) {
      query.companyId = companyId;
    }

    const payrollRecords = await Payroll.find(query)
      .populate('employeeId', 'name email phone department designation')
      .populate('companyId', 'name');

    if (payrollRecords.length === 0) {
      return NextResponse.json({ message: 'No matching payroll records found' }, { status: 404 });
    }

    // One config lookup per distinct company, reused for the whole batch.
    const configCache = new Map<string, RazorpayXResolvedConfig | null>();
    const getCompanyConfig = async (id: string): Promise<RazorpayXResolvedConfig | null> => {
      if (!configCache.has(id)) {
        configCache.set(id, await getRazorpayXConfig(id));
      }
      return configCache.get(id) ?? null;
    };

    // Fail fast with the same code the UI already handles.
    const records = payrollRecords as unknown as PayrollRecordLike[];
    const distinctCompanyIds = [...new Set(records.map(getRecordCompanyId))];

    if (!isSuperAdmin) {
      const config = companyId ? await getCompanyConfig(String(companyId)) : null;
      if (!config) {
        return NextResponse.json({
          message: 'RazorpayX is not configured. Please add your credentials in Payroll Settings.',
          code: 'RAZORPAYX_NOT_CONFIGURED',
        }, { status: 400 });
      }
    } else {
      const configs = await Promise.all(distinctCompanyIds.map((id) => getCompanyConfig(id)));
      if (configs.every((c) => !c)) {
        return NextResponse.json({
          message: 'RazorpayX is not configured for any of the selected companies.',
          code: 'RAZORPAYX_NOT_CONFIGURED',
        }, { status: 400 });
      }
    }

    let successfulCount = 0;
    let failedCount = 0;
    let paidCount = 0;
    let processingCount = 0;
    let totalDisbursed = 0;
    let totalInitiated = 0;

    const results = await mapWithConcurrency(records, MAX_CONCURRENCY, async (record: PayrollRecordLike): Promise<PayoutItemResult> => {
      // Skip if already Paid
      if (record.status === 'Paid') {
        return {
          payrollId: record._id,
          employeeName: record.employeeId?.name,
          status: 'Already Paid',
          success: true,
          utr: record.utr,
          payoutId: record.payoutId,
        };
      }

      // Never create a second payout while an earlier one is still in flight.
      if (record.status === 'Processing' && record.payoutId) {
        return {
          payrollId: record._id,
          employeeName: record.employeeId?.name,
          status: 'Processing',
          payoutStatus: record.payoutStatus,
          payoutId: record.payoutId,
          utr: record.utr,
          success: true,
          error: 'A payout for this record is already in progress. Check status instead.',
        };
      }

      const emp = record.employeeId;
      if (!emp) {
        failedCount++;
        return {
          payrollId: record._id,
          status: 'Failed',
          success: false,
          error: 'Employee record not found',
        };
      }

      const recordCompanyId = getRecordCompanyId(record);
      const config = await getCompanyConfig(recordCompanyId);
      if (!config) {
        const errMsg = `RazorpayX is not configured for ${emp.name}'s company. Add credentials in Payroll Settings.`;
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: errMsg,
        });
        failedCount++;
        return {
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: errMsg,
        };
      }

      // Resolve employee bank details
      const bankDetails = await resolveEmployeeBankDetails(String(emp._id));
      if (!bankDetails) {
        const errMsg = `Missing bank account details for ${emp.name}. Please ensure bank details are submitted and verified.`;
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: errMsg,
        });
        failedCount++;
        return {
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: errMsg,
        };
      }

      const salaryAmount = Number(record.netSalary) || 0;
      if (salaryAmount <= 0) {
        const errMsg = `Net salary for ${emp.name} is zero or invalid, so no payout was created.`;
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: errMsg,
        });
        failedCount++;
        return {
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: errMsg,
        };
      }

      const payoutMode = (mode || config.defaultMode || 'IMPS') as PayoutMode;
      const fingerprint = computeBankFingerprint(bankDetails, payoutMode);
      const attemptFingerprint = createHash('sha256')
        .update(`${fingerprint}|${payoutMode}|${salaryAmount}`)
        .digest('hex');
      const cachedFundAccountId =
        bankDetails.fundAccountId && bankDetails.cachedFingerprint === fingerprint
          ? bankDetails.fundAccountId
          : undefined;

      // Create or reuse an idempotency key. Reuse only after an unknown outcome,
      // and only when the payout payload (bank details, mode, amount) is unchanged.
      const canReuseKey = Boolean(
        record.payoutIdempotencyReusable &&
          record.payoutIdempotencyKey &&
          record.payoutIdempotencyFingerprint === attemptFingerprint
      );
      let idempotencyKey = canReuseKey ? String(record.payoutIdempotencyKey) : randomUUID();

      await Payroll.findByIdAndUpdate(record._id, {
        payoutIdempotencyKey: idempotencyKey,
        payoutIdempotencyReusable: true,
        payoutIdempotencyFingerprint: attemptFingerprint,
      });

      const callPayout = (fundAccountId: string | undefined, key: string) =>
        createRazorpayXPayout({
          companyId: recordCompanyId,
          payrollId: String(record._id),
          employee: {
            _id: String(emp._id),
            name: emp.name,
            email: emp.email,
            phone: emp.phone,
          },
          bankDetails,
          amountInRupees: salaryAmount,
          month: record.month,
          year: record.year,
          mode: payoutMode,
          narration,
          fundAccountId,
          idempotencyKey: key,
        });

      // Reconcile before creating a new payout: a previous attempt may have been
      // accepted by RazorpayX even though we never received its response.
      let reconciledPayout: PayoutResult | null = null;
      if (record.payoutIdempotencyReusable) {
        const referenceId = buildPayoutReferenceId(String(record._id), record.month, record.year);
        const existingPayouts = await findRazorpayXPayoutsByReference(referenceId, recordCompanyId);
        const match = existingPayouts.find((p) => {
          const isTerminalFailure = ['failed', 'cancelled', 'rejected', 'reversed'].includes(
            p.payoutStatus || ''
          );
          const amount = (p.raw as { amount?: number } | undefined)?.amount;
          return !isTerminalFailure && (!amount || amount === Math.round(salaryAmount * 100));
        });
        if (match) reconciledPayout = match;
      }

      let payoutRes: PayoutResult;
      if (reconciledPayout) {
        // Adopt the payout that was already created instead of paying twice.
        payoutRes = reconciledPayout;
      } else {
        payoutRes = await callPayout(cachedFundAccountId, idempotencyKey);

        // A cached fund account can become invalid (closed account, changed details).
        // Clear it and retry once with a fresh composite payload + new idempotency key.
        if (!payoutRes.success && cachedFundAccountId && !payoutRes.ambiguous) {
          await clearCachedFundAccount(bankDetails);
          idempotencyKey = randomUUID();
          await Payroll.findByIdAndUpdate(record._id, {
            payoutIdempotencyKey: idempotencyKey,
            payoutIdempotencyReusable: true,
            payoutIdempotencyFingerprint: attemptFingerprint,
          });
          payoutRes = await callPayout(undefined, idempotencyKey);
        }
      }

      if (!payoutRes.success) {
        const ambiguous = Boolean(payoutRes.ambiguous);
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: ambiguous
            ? `Payout outcome unknown: ${payoutRes.error}. Retrying is safe.`
            : payoutRes.error || 'RazorpayX payout failed',
          paymentMethod: 'razorpayx',
          payoutIdempotencyKey: payoutRes.idempotencyKey || idempotencyKey,
          payoutIdempotencyReusable: ambiguous,
          payoutIdempotencyFingerprint: attemptFingerprint,
        });
        failedCount++;
        return {
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: payoutRes.error,
        };
      }

      const mappedStatus = mapPayoutStatus(payoutRes.payoutStatus);
      const failureReason =
        payoutRes.statusDetails?.description ||
        payoutRes.statusDetails?.reason ||
        undefined;

      // A 2xx response can still carry a terminal failure status.
      if (mappedStatus === 'Failed') {
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          paymentMethod: 'razorpayx',
          payoutId: payoutRes.payoutId,
          payoutStatus: payoutRes.payoutStatus,
          payoutMode: payoutRes.mode,
          utr: payoutRes.utr,
          payoutFee: payoutRes.fee || 0,
          payoutTax: payoutRes.tax || 0,
          payoutInitiatedAt: new Date(),
          failureReason: failureReason || `RazorpayX payout ${payoutRes.payoutStatus}`,
          payoutIdempotencyKey: payoutRes.idempotencyKey || idempotencyKey,
          payoutIdempotencyReusable: false,
          payoutIdempotencyFingerprint: attemptFingerprint,
        });
        failedCount++;
        return {
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          payoutStatus: payoutRes.payoutStatus,
          payoutId: payoutRes.payoutId,
          utr: payoutRes.utr,
          amount: salaryAmount,
          success: false,
          error: failureReason,
        };
      }

      // Cache the Razorpay fund account for future payouts.
      if (payoutRes.fundAccountId) {
        await cacheFundAccount(bankDetails, payoutRes.fundAccountId, fingerprint);
      }

      const updateData: Record<string, unknown> = {
        status: mappedStatus,
        paymentMethod: 'razorpayx',
        payoutId: payoutRes.payoutId,
        payoutStatus: payoutRes.payoutStatus,
        payoutMode: payoutRes.mode,
        utr: payoutRes.utr,
        payoutFee: payoutRes.fee || 0,
        payoutTax: payoutRes.tax || 0,
        payoutInitiatedAt: new Date(),
        failureReason: null,
        payoutIdempotencyKey: payoutRes.idempotencyKey || idempotencyKey,
        payoutIdempotencyReusable: false,
        payoutIdempotencyFingerprint: attemptFingerprint,
        accountNumberMasked: maskAccountNumber(bankDetails.accountNumber),
        transactionReferenceMasked: maskGeneric(payoutRes.payoutId || payoutRes.utr, 4),
        encryptedPaymentDetails: encryptObject({
          transactionReference: payoutRes.payoutId,
          utr: payoutRes.utr,
          paymentGateway: 'razorpayx',
          recipientAccountMasked: maskAccountNumber(bankDetails.accountNumber),
          paymentMethod: 'bank_transfer',
          paidAt: new Date().toISOString(),
        }),
      };

      if (mappedStatus === 'Paid') {
        updateData.paymentDate = new Date();
        updateData.payoutProcessedAt = new Date();
      }

      await Payroll.findByIdAndUpdate(record._id, updateData);

      // Trigger notification
      const monthLabel = MONTH_NAMES[record.month] || `Month ${record.month + 1}`;
      const amountStr = `₹${salaryAmount.toLocaleString('en-IN')}`;

      if (mappedStatus === 'Paid') {
        await notify({
          companyId: recordCompanyId,
          kind: 'payroll',
          title: 'Salary disbursed via RazorpayX',
          message: `Your salary for ${monthLabel} ${record.year} of ${amountStr} has been credited to your bank account (UTR: ${payoutRes.utr || 'N/A'}).`,
          href: '/payslips',
          meta: 'Paid',
          recipientIds: [String(emp._id)],
          actorId: auth.userId,
          dedupeKey: `payroll-paid:${record._id}:${payoutRes.payoutId}`,
        });
      } else {
        await notify({
          companyId: recordCompanyId,
          kind: 'payroll',
          title: 'Salary transfer initiated',
          message: `Your salary payout for ${monthLabel} ${record.year} of ${amountStr} has been initiated via RazorpayX (ID: ${payoutRes.payoutId}).`,
          href: '/payslips',
          meta: 'Processing',
          recipientIds: [String(emp._id)],
          actorId: auth.userId,
          dedupeKey: `payroll-processing:${record._id}:${payoutRes.payoutId}`,
        });
      }

      successfulCount++;
      if (mappedStatus === 'Paid') {
        paidCount++;
        totalDisbursed += salaryAmount;
      } else {
        processingCount++;
        totalInitiated += salaryAmount;
      }

      return {
        payrollId: record._id,
        employeeName: emp.name,
        status: mappedStatus,
        payoutStatus: payoutRes.payoutStatus,
        payoutId: payoutRes.payoutId,
        utr: payoutRes.utr,
        amount: salaryAmount,
        success: true,
      };
    });

    return NextResponse.json({
      message: `Disbursement completed: ${successfulCount} accepted (${paidCount} paid, ${processingCount} processing), ${failedCount} failed`,
      totalDisbursed,
      totalInitiated,
      successfulCount,
      paidCount,
      processingCount,
      failedCount,
      results,
    });
  } catch (error: unknown) {
    console.error('[RazorpayX Payout API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Payout processing error';
    return NextResponse.json({ message: 'Payout processing error', error: msg }, { status: 500 });
  }
}

/**
 * GET /api/payroll/payout?payrollId=...
 * Refreshes live payout status from RazorpayX for a specific payroll record.
 */
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const payrollId = searchParams.get('payrollId');

    if (!payrollId) {
      return NextResponse.json({ message: 'Missing payrollId parameter' }, { status: 400 });
    }

    const payroll = await Payroll.findById(payrollId)
      .populate('employeeId', 'name email');

    if (!payroll) {
      return NextResponse.json({ message: 'Payroll record not found' }, { status: 404 });
    }

    // Authorization: owner can check, privileged can check
    const isOwner = auth.userId === String(payroll.employeeId?._id);
    const isPrivileged = hasRole(auth.role, ['super_admin', 'admin', 'hr']);

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (auth.role !== 'super_admin' && String(payroll.companyId) !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    if (!payroll.payoutId) {
      return NextResponse.json({
        payrollId: payroll._id,
        status: payroll.status,
        message: 'No RazorpayX payout associated with this record',
      });
    }

    // Fetch live status from RazorpayX
    const details = await getRazorpayXPayoutDetails(payroll.payoutId, String(payroll.companyId));

    if (!details.success) {
      return NextResponse.json({
        payrollId: payroll._id,
        status: payroll.status,
        payoutStatus: payroll.payoutStatus,
        error: details.error,
      }, { status: 400 });
    }

    const mappedStatus = mapPayoutStatus(details.payoutStatus);
    const statusDetails = details.statusDetails;

    // Sync status changes
    const updates: Record<string, unknown> = {
      payoutStatus: details.payoutStatus,
    };

    if (details.utr) {
      updates.utr = details.utr;
    }
    if (details.fee !== undefined) {
      updates.payoutFee = details.fee;
    }
    if (details.tax !== undefined) {
      updates.payoutTax = details.tax;
    }

    if (mappedStatus === 'Paid') {
      if (payroll.status !== 'Paid') {
        updates.status = 'Paid';
        updates.paymentDate = new Date();
        updates.payoutProcessedAt = new Date();
        updates.failureReason = null;

        const monthLabel = MONTH_NAMES[payroll.month] || `Month ${payroll.month + 1}`;
        await notify({
          companyId: String(payroll.companyId),
          kind: 'payroll',
          title: 'Salary disbursed via RazorpayX',
          message: `Your salary for ${monthLabel} ${payroll.year} of ₹${(payroll.netSalary || 0).toLocaleString('en-IN')} has been disbursed (UTR: ${details.utr || 'N/A'}).`,
          href: '/payslips',
          meta: 'Paid',
          recipientIds: [String(payroll.employeeId._id)],
          actorId: auth.userId,
          dedupeKey: `payroll-paid:${payroll._id}:${details.payoutId}`,
        });
      }
    } else if (mappedStatus === 'Failed') {
      updates.status = 'Failed';
      updates.failureReason =
        statusDetails?.description ||
        statusDetails?.reason ||
        `Payout ${details.payoutStatus} by RazorpayX`;
    } else if (payroll.status !== 'Paid') {
      updates.status = 'Processing';
    }

    const updatedPayroll = await Payroll.findByIdAndUpdate(payrollId, updates, { new: true });

    return NextResponse.json({
      payrollId: updatedPayroll._id,
      status: updatedPayroll.status,
      payoutStatus: updatedPayroll.payoutStatus,
      utr: updatedPayroll.utr,
      mode: updatedPayroll.payoutMode,
      updated: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error checking payout status';
    return NextResponse.json({ message: 'Error checking payout status', error: msg }, { status: 500 });
  }
}
