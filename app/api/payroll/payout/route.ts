import { NextResponse } from 'next/server';
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
  PayoutBankDetails 
} from '@/lib/razorpayx';
import { 
  decryptObject, 
  encryptObject, 
  maskAccountNumber, 
  maskGeneric,
  IEncryptedBankDetails 
} from '@/lib/security/encryption';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Resolves decrypted bank details for an employee from either BankDetail or Employee model.
 */
async function resolveEmployeeBankDetails(userId: string): Promise<PayoutBankDetails | null> {
  // 1. Try dedicated BankDetail model first
  const bankRecord = await BankDetail.findOne({ userId });
  if (bankRecord && bankRecord.encryptedDetails) {
    const decrypted = decryptObject<IEncryptedBankDetails>(bankRecord.encryptedDetails);
    if (decrypted && decrypted.accountNumber && decrypted.ifscCode) {
      return {
        accountHolderName: decrypted.accountHolderName || bankRecord.accountHolderName,
        accountNumber: decrypted.accountNumber,
        ifscCode: decrypted.ifscCode,
        bankName: decrypted.bankName || bankRecord.bankName,
        upiId: decrypted.upiId,
      };
    }
  }

  // 2. Fall back to Employee model's encryptedBankDetails
  const employeeRecord = await Employee.findOne({ userId });
  if (employeeRecord && employeeRecord.encryptedBankDetails) {
    const decrypted = decryptObject<IEncryptedBankDetails>(employeeRecord.encryptedBankDetails);
    if (decrypted && decrypted.accountNumber && decrypted.ifscCode) {
      return {
        accountHolderName: decrypted.accountHolderName || '',
        accountNumber: decrypted.accountNumber,
        ifscCode: decrypted.ifscCode,
        bankName: decrypted.bankName,
        upiId: decrypted.upiId,
      };
    }
  }

  return null;
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

    const isSuperAdmin = auth.role === 'super_admin';
    const companyId = auth.companyId;

    if (!companyId && !isSuperAdmin) {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }

    // Verify RazorpayX configuration exists
    const resolvedConfig = await getRazorpayXConfig(companyId || undefined);
    if (!resolvedConfig) {
      return NextResponse.json({
        message: 'RazorpayX is not configured. Please add your credentials in Payroll Settings.',
        code: 'RAZORPAYX_NOT_CONFIGURED',
      }, { status: 400 });
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

    const results = [];
    let successfulCount = 0;
    let failedCount = 0;
    let totalDisbursed = 0;

    for (const record of payrollRecords) {
      // Skip if already Paid
      if (record.status === 'Paid') {
        results.push({
          payrollId: record._id,
          employeeName: record.employeeId?.name,
          status: 'Already Paid',
          success: true,
          utr: record.utr,
          payoutId: record.payoutId,
        });
        continue;
      }

      const emp = record.employeeId;
      if (!emp) {
        results.push({
          payrollId: record._id,
          status: 'Failed',
          success: false,
          error: 'Employee record not found',
        });
        failedCount++;
        continue;
      }

      // Resolve employee bank details
      const bankDetails = await resolveEmployeeBankDetails(String(emp._id));
      if (!bankDetails) {
        const errMsg = `Missing bank account details for ${emp.name}. Please ensure bank details are submitted and verified.`;
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: errMsg,
        });
        results.push({
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: errMsg,
        });
        failedCount++;
        continue;
      }

      // Execute Payout via RazorpayX
      const payoutRes = await createRazorpayXPayout({
        companyId: String(record.companyId?._id || record.companyId || companyId),
        payrollId: String(record._id),
        employee: {
          _id: String(emp._id),
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
        },
        bankDetails,
        amountInRupees: record.netSalary,
        month: record.month,
        year: record.year,
        mode,
        narration,
      });

      if (!payoutRes.success) {
        await Payroll.findByIdAndUpdate(record._id, {
          status: 'Failed',
          failureReason: payoutRes.error || 'RazorpayX payout failed',
          paymentMethod: 'razorpayx',
        });
        results.push({
          payrollId: record._id,
          employeeName: emp.name,
          status: 'Failed',
          success: false,
          error: payoutRes.error,
        });
        failedCount++;
        continue;
      }

      // RazorpayX status mapping
      // 'processed' -> instantaneous completion
      // 'queued' | 'pending' | 'processing' -> in flight
      const isInstantPaid = payoutRes.payoutStatus === 'processed';
      const newStatus = isInstantPaid ? 'Paid' : 'Processing';

      const updateData: Record<string, unknown> = {
        status: newStatus,
        paymentMethod: 'razorpayx',
        payoutId: payoutRes.payoutId,
        payoutStatus: payoutRes.payoutStatus,
        payoutMode: payoutRes.mode,
        utr: payoutRes.utr,
        payoutFee: payoutRes.fee || 0,
        payoutTax: payoutRes.tax || 0,
        payoutInitiatedAt: new Date(),
        failureReason: null,
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

      if (isInstantPaid) {
        updateData.paymentDate = new Date();
        updateData.payoutProcessedAt = new Date();
      }

      await Payroll.findByIdAndUpdate(record._id, updateData);

      // Trigger notification
      const monthLabel = MONTH_NAMES[record.month] || `Month ${record.month + 1}`;
      const amountStr = `₹${(record.netSalary || 0).toLocaleString('en-IN')}`;

      if (isInstantPaid) {
        await notify({
          companyId: String(record.companyId?._id || record.companyId || companyId),
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
          companyId: String(record.companyId?._id || record.companyId || companyId),
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
      totalDisbursed += record.netSalary;
      results.push({
        payrollId: record._id,
        employeeName: emp.name,
        status: newStatus,
        payoutStatus: payoutRes.payoutStatus,
        payoutId: payoutRes.payoutId,
        utr: payoutRes.utr,
        amount: record.netSalary,
        success: true,
      });
    }

    return NextResponse.json({
      message: `Disbursement completed: ${successfulCount} successful, ${failedCount} failed`,
      totalDisbursed,
      successfulCount,
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

    // Sync status changes
    const updates: Record<string, unknown> = {
      payoutStatus: details.payoutStatus,
    };

    if (details.utr) {
      updates.utr = details.utr;
    }

    if (details.payoutStatus === 'processed' && payroll.status !== 'Paid') {
      updates.status = 'Paid';
      updates.paymentDate = new Date();
      updates.payoutProcessedAt = new Date();

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
    } else if (['reversed', 'cancelled', 'rejected'].includes(details.payoutStatus || '')) {
      updates.status = 'Failed';
      updates.failureReason = `Payout ${details.payoutStatus} by RazorpayX`;
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
