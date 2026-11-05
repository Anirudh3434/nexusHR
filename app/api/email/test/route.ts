import { NextResponse } from 'next/server';
import { getAuthInfo } from '@/lib/auth-util';
import { sendMail, verifySmtpConnection, getSmtpConfig } from '@/lib/nodemailer';

/**
 * GET /api/email/test
 * Verifies current SMTP connection without exposing sensitive credentials.
 */
export async function GET() {
  try {
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const config = getSmtpConfig();
    const result = await verifySmtpConnection();

    return NextResponse.json({
      success: result.success,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user ? config.user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'Not configured',
      isConfigured: Boolean(config.user && config.pass),
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'SMTP verification failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email/test
 * Sends a test email to the specified recipient or the authenticated user's email.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const recipient = body.to || auth.email || process.env.SMTP_USER || 'nexushr36@gmail.com';
    const testSubject = body.subject || 'NexusHR — SMTP Test Email';
    const customMessage = body.message || 'This is a test email sent from your NexusHR backend via Nodemailer.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="background-color: #2563eb; color: #ffffff; padding: 16px 20px; border-radius: 6px 6px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">NexusHR Notification</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Email Delivery Verification</p>
        </div>
        <div style="padding: 24px 20px; color: #1f2937; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Hello,</p>
          <p style="font-size: 14px;">${customMessage}</p>
          <div style="background-color: #f3f4f6; padding: 14px; border-radius: 6px; font-size: 13px; margin: 18px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p style="margin: 0 0 6px 0;"><strong>Sender:</strong> ${process.env.SMTP_USER || process.env.GMAIL_USER || 'nexushr36@gmail.com'}</p>
            <p style="margin: 0;"><strong>Recipient:</strong> ${recipient}</p>
          </div>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
            If you received this message, your backend Nodemailer and SMTP configurations are operational.
          </p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 20px; text-align: center; color: #9ca3af; font-size: 11px;">
          © ${new Date().getFullYear()} NexusHR. All rights reserved.
        </div>
      </div>
    `;

    const result = await sendMail({
      to: recipient,
      subject: testSubject,
      html,
      text: `${customMessage}\n\nTimestamp: ${new Date().toISOString()}\nRecipient: ${recipient}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      messageId: result.messageId,
      recipient,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error sending test email' },
      { status: 500 }
    );
  }
}

