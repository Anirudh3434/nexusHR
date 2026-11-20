import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import { notify } from '@/lib/notify';
import { verifyRazorpayXWebhookSignature, getRazorpayXWebhookSecret } from '@/lib/razorpayx';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

interface RazorpayXPayoutEntity {
  id: string;
  status?: string;
  utr?: string;
  fees?: number;
  tax?: number;
  notes?: {
    payrollId?: string;
    employeeId?: string;
  };
  status_details?: {
    description?: string;
    reason?: string;
    source?: string;
  };
  failure_reason?: string;
  /** @deprecated Razorpay has deprecated the error object; kept as a fallback. */
  error?: {
    description?: string;
    reason?: string;
    source?: string;
  };
}

interface RazorpayXWebhookPayload {
  event?: string;
  payload?: {
    payout?: {
      entity?: RazorpayXPayoutEntity;
    };
  };
}

function getFailureDescription(entity: RazorpayXPayoutEntity): string {
  return (
    entity.status_details?.description ||
    entity.status_details?.reason ||
    entity.failure_reason ||
    entity.error?.description ||
    `Payout ${entity.status || 'failed'}`
  );
}

function mapPayoutStatus(status?: string): 'Paid' | 'Processing' | 'Failed' {
  if (status === 'processed') return 'Paid';
  if (['failed', 'reversed', 'rejected', 'cancelled'].includes(status || '')) return 'Failed';
  return 'Processing';
}

const TERMINAL_PAYOUT_STATUSES = [
  'processed',
  'failed',
  'reversed',
  'rejected',
  'cancelled',
];

function isTerminalPayoutStatus(status?: string | null): boolean {
  return Boolean(status && TERMINAL_PAYOUT_STATUSES.includes(status));
}

/**
 * POST /api/webhooks/razorpayx
 * Handles asynchronous RazorpayX payout lifecycle events:
 * - payout.pending / queued / initiated: in-flight states
 * - payout.processed: Salary successfully deposited into bank account
 * - payout.reversed / failed / rejected / cancelled: terminal failures
 * - payout.updated: generic entity change (can carry a terminal status)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!rawBody) {
      return NextResponse.json({ message: 'Empty body' }, { status: 400 });
    }

    let eventData: RazorpayXWebhookPayload | null = null;
    try {
      eventData = JSON.parse(rawBody) as RazorpayXWebhookPayload;
    } catch {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventName = eventData?.event;
    const payoutEntity = eventData?.payload?.payout?.entity;

    if (!payoutEntity || !payoutEntity.id) {
      return NextResponse.json({ message: 'Ignored: No payout entity in event' }, { status: 200 });
    }

    await connectDB();

    const payoutId = payoutEntity.id;
    const payrollId = payoutEntity.notes?.payrollId;

    // Minimal lookup needed only to resolve the company's webhook secret.
    // No state is mutated until the signature has been verified.
    let minimalPayroll = null;
    if (payrollId && OBJECT_ID_PATTERN.test(payrollId)) {
      minimalPayroll = await Payroll.findById(payrollId).select('companyId').lean();
    }
    if (!minimalPayroll) {
      minimalPayroll = await Payroll.findOne({ payoutId }).select('companyId').lean();
    }

    if (!minimalPayroll) {
      console.warn(`[RazorpayX Webhook] No matching payroll record for payout ${payoutId}`);
      return NextResponse.json({ message: 'Payroll record not found for payout' }, { status: 200 });
    }

    const webhookSecret = await getRazorpayXWebhookSecret(String(minimalPayroll.companyId));
    if (!webhookSecret) {
      console.error(
        '[RazorpayX Webhook] Rejecting event because no webhook secret is configured for company:',
        String(minimalPayroll.companyId)
      );
      return NextResponse.json({ message: 'Webhook secret is not configured' }, { status: 401 });
    }

    const isValid = verifyRazorpayXWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('[RazorpayX Webhook] Invalid signature for payout:', payoutId);
      return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
    }

    // Signature is valid: safe to load and mutate the payroll record.
    const payroll = await Payroll.findById(minimalPayroll._id).populate('employeeId', 'name email');
    if (!payroll) {
      // It could have been deleted between the minimal lookup and now.
      return NextResponse.json({ message: 'Payroll record not found for payout' }, { status: 200 });
    }

    const monthLabel = MONTH_NAMES[payroll.month] || `Month ${payroll.month + 1}`;
    const amountStr = `₹${(payroll.netSalary || 0).toLocaleString('en-IN')}`;
    const companyId = String(payroll.companyId);

    const markProcessed = async () => {
      // Out-of-order events must not overwrite a later reversal.
      if (payroll.payoutStatus === 'reversed') {
        console.warn('[RazorpayX Webhook] Ignoring processed event for reversed payout:', payoutId);
        return;
      }

      const utr = payoutEntity.utr || payroll.utr;
      await Payroll.findByIdAndUpdate(payroll._id, {
        status: 'Paid',
        payoutStatus: 'processed',
        utr,
        paymentDate: new Date(),
        payoutProcessedAt: new Date(),
        payoutFee: payoutEntity.fees ? payoutEntity.fees / 100 : payroll.payoutFee,
        payoutTax: payoutEntity.tax ? payoutEntity.tax / 100 : payroll.payoutTax,
        failureReason: null,
      });

      if (payroll.employeeId?._id) {
        await notify({
          companyId,
          kind: 'payroll',
          title: 'Salary credited to your account',
          message: `Your salary for ${monthLabel} ${payroll.year} of ${amountStr} has been credited (UTR: ${utr || 'N/A'}).`,
          href: '/payslips',
          meta: 'Paid',
          recipientIds: [String(payroll.employeeId._id)],
          dedupeKey: `payroll-paid:${payroll._id}:${payoutId}`,
        });
      }
    };

    const markFailed = async (payoutStatus: string | undefined, failureReason: string) => {
      await Payroll.findByIdAndUpdate(payroll._id, {
        status: 'Failed',
        payoutStatus: payoutStatus || 'failed',
        failureReason,
      });

      await notify({
        companyId,
        kind: 'payroll',
        title: 'Salary payout failed',
        message: `The salary transfer for ${payroll.employeeId?.name || 'an employee'} (${monthLabel} ${payroll.year}) failed: ${failureReason}.`,
        href: '/payroll',
        roles: ['super_admin', 'admin', 'hr'],
        dedupeKey: `payroll-failed:${payroll._id}:${payoutId}`,
      });
    };

    const markInFlight = async (status?: string) => {
      // Never regress an already-final payout state with a late queued/pending event.
      if (isTerminalPayoutStatus(payroll.payoutStatus)) {
        return;
      }

      const updates: Record<string, unknown> = {
        payoutStatus: status,
      };
      if (payoutEntity.utr) updates.utr = payoutEntity.utr;
      if (payroll.status !== 'Paid') {
        updates.status = 'Processing';
      }
      await Payroll.findByIdAndUpdate(payroll._id, updates);
    };

    switch (eventName) {
      case 'payout.processed': {
        await markProcessed();
        break;
      }

      case 'payout.reversed': {
        await markFailed('reversed', `Reversed: ${getFailureDescription(payoutEntity)}`);
        break;
      }

      case 'payout.failed':
      case 'payout.rejected':
      case 'payout.cancelled': {
        await markFailed(payoutEntity.status || eventName.replace('payout.', ''), getFailureDescription(payoutEntity));
        break;
      }

      case 'payout.updated': {
        // `payout.updated` can carry a terminal status. Use it so a missed
        // payout.processed event does not leave the payroll stuck in Processing.
        const mapped = mapPayoutStatus(payoutEntity.status);
        if (mapped === 'Paid') {
          await markProcessed();
        } else if (mapped === 'Failed') {
          await markFailed(payoutEntity.status, getFailureDescription(payoutEntity));
        } else {
          await markInFlight(payoutEntity.status);
        }
        break;
      }

      case 'payout.pending':
      case 'payout.queued':
      case 'payout.initiated': {
        await markInFlight(payoutEntity.status || eventName.replace('payout.', ''));
        break;
      }

      default:
        console.log(`[RazorpayX Webhook] Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ success: true, event: eventName, payoutId });
  } catch (err: unknown) {
    console.error('[RazorpayX Webhook Error]:', err);
    const msg = err instanceof Error ? err.message : 'Webhook processing error';
    return NextResponse.json({ message: 'Webhook processing error', error: msg }, { status: 500 });
  }
}
