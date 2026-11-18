import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import { notify } from '@/lib/notify';
import { verifyRazorpayXWebhookSignature, getRazorpayXConfig } from '@/lib/razorpayx';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * POST /api/webhooks/razorpayx
 * Handles asynchronous RazorpayX payout lifecycle events:
 * - payout.processed: Salary successfully deposited into bank account
 * - payout.reversed: Bank reversal, marks payroll as Failed and alerts
 * - payout.failed / payout.rejected: Payout failed
 * - payout.updated: Status update
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!rawBody) {
      return NextResponse.json({ message: 'Empty body' }, { status: 400 });
    }

    interface RazorpayXWebhookPayload {
      event?: string;
      payload?: {
        payout?: {
          entity?: {
            id: string;
            status?: string;
            utr?: string;
            fee?: number;
            tax?: number;
            notes?: {
              payrollId?: string;
              employeeId?: string;
            };
            error?: {
              description?: string;
            };
          };
        };
      };
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

    // Find the associated Payroll record
    const payoutId = payoutEntity.id;
    const payrollId = payoutEntity.notes?.payrollId;

    let payroll = null;
    if (payrollId) {
      payroll = await Payroll.findById(payrollId).populate('employeeId', 'name email');
    }
    if (!payroll) {
      payroll = await Payroll.findOne({ payoutId }).populate('employeeId', 'name email');
    }

    if (!payroll) {
      console.warn(`[RazorpayX Webhook] No matching payroll record for payout ${payoutId}`);
      return NextResponse.json({ message: 'Payroll record not found for payout' }, { status: 200 });
    }

    // Verify webhook signature if a webhook secret is configured
    const config = await getRazorpayXConfig(String(payroll.companyId));
    if (config?.webhookSecret) {
      const isValid = verifyRazorpayXWebhookSignature(rawBody, signature, config.webhookSecret);
      if (!isValid) {
        console.error('[RazorpayX Webhook] Invalid signature for payout:', payoutId);
        return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const monthLabel = MONTH_NAMES[payroll.month] || `Month ${payroll.month + 1}`;
    const amountStr = `₹${(payroll.netSalary || 0).toLocaleString('en-IN')}`;

    switch (eventName) {
      case 'payout.processed': {
        const utr = payoutEntity.utr || payroll.utr;
        await Payroll.findByIdAndUpdate(payroll._id, {
          status: 'Paid',
          payoutStatus: 'processed',
          utr,
          paymentDate: new Date(),
          payoutProcessedAt: new Date(),
          payoutFee: payoutEntity.fee ? payoutEntity.fee / 100 : payroll.payoutFee,
          payoutTax: payoutEntity.tax ? payoutEntity.tax / 100 : payroll.payoutTax,
          failureReason: null,
        });

        // Notify employee of verified bank deposit
        if (payroll.employeeId?._id) {
          await notify({
            companyId: String(payroll.companyId),
            kind: 'payroll',
            title: 'Salary credited to your account',
            message: `Your salary for ${monthLabel} ${payroll.year} of ${amountStr} has been credited (UTR: ${utr || 'N/A'}).`,
            href: '/payslips',
            meta: 'Paid',
            recipientIds: [String(payroll.employeeId._id)],
            dedupeKey: `webhook-paid:${payroll._id}:${payoutId}`,
          });
        }
        break;
      }

      case 'payout.reversed': {
        const errorDesc = payoutEntity.error?.description || 'Payout reversed by receiving bank';
        await Payroll.findByIdAndUpdate(payroll._id, {
          status: 'Failed',
          payoutStatus: 'reversed',
          failureReason: `Reversed: ${errorDesc}`,
        });

        // Notify HR and employee
        await notify({
          companyId: String(payroll.companyId),
          kind: 'payroll',
          title: 'Salary payout reversed',
          message: `The salary transfer for ${payroll.employeeId?.name || 'an employee'} (${monthLabel} ${payroll.year}) was reversed: ${errorDesc}.`,
          href: '/payroll',
          roles: ['super_admin', 'admin', 'hr'],
          dedupeKey: `webhook-reversed:${payroll._id}:${payoutId}`,
        });
        break;
      }

      case 'payout.failed':
      case 'payout.rejected': {
        const errorDesc = payoutEntity.error?.description || `Payout ${payoutEntity.status || 'failed'}`;
        await Payroll.findByIdAndUpdate(payroll._id, {
          status: 'Failed',
          payoutStatus: payoutEntity.status || 'failed',
          failureReason: errorDesc,
        });

        await notify({
          companyId: String(payroll.companyId),
          kind: 'payroll',
          title: 'Salary payout failed',
          message: `The salary transfer for ${payroll.employeeId?.name || 'an employee'} (${monthLabel} ${payroll.year}) failed: ${errorDesc}.`,
          href: '/payroll',
          roles: ['super_admin', 'admin', 'hr'],
          dedupeKey: `webhook-failed:${payroll._id}:${payoutId}`,
        });
        break;
      }

      case 'payout.updated':
      case 'payout.queued':
      case 'payout.initiated': {
        await Payroll.findByIdAndUpdate(payroll._id, {
          payoutStatus: payoutEntity.status,
          utr: payoutEntity.utr || payroll.utr,
        });
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
