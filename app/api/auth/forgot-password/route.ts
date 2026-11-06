import { NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import SuperAdmin from '@/models/SuperAdmin';
import Company from '@/models/Company';
import { sendMail } from '@/lib/nodemailer';
import { generateOtpEmailHtml } from '@/lib/templates/otpEmailTemplate';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, isSuperAdmin } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'A valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Generate secure 6-digit numeric OTP
    const rawOtp = String(crypto.randomInt(100000, 999999));
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let accountFound = false;
    let userName = 'Team Member';
    let companyName = 'NexusHR Workspace';

    // 2. Look up in SuperAdmin if specified or check User first
    if (isSuperAdmin) {
      const admin = await SuperAdmin.findOne({ email: cleanEmail });
      if (admin) {
        admin.resetPasswordToken = hashedOtp;
        admin.resetPasswordExpires = tokenExpiry;
        await admin.save();
        accountFound = true;
        userName = admin.name || 'Platform Administrator';
        companyName = 'NexusHR Platform';
      }
    } else {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        user.resetPasswordToken = hashedOtp;
        user.resetPasswordExpires = tokenExpiry;
        await user.save();
        accountFound = true;
        userName = user.name || 'Team Member';

        if (user.companyId) {
          try {
            const company = await Company.findById(user.companyId).select('name');
            if (company?.name) companyName = company.name;
          } catch {}
        }
      } else {
        // Fallback: check if it's a superadmin without isSuperAdmin flag
        const admin = await SuperAdmin.findOne({ email: cleanEmail });
        if (admin) {
          admin.resetPasswordToken = hashedOtp;
          admin.resetPasswordExpires = tokenExpiry;
          await admin.save();
          accountFound = true;
          userName = admin.name || 'Platform Administrator';
          companyName = 'NexusHR Platform';
        }
      }
    }

    if (!accountFound) {
      return NextResponse.json(
        { message: 'No account registered with this email address.' },
        { status: 404 }
      );
    }

    // 3. Compose and send high-fidelity OTP email via Nodemailer Gmail SMTP
    const logoFilePath = path.join(process.cwd(), 'public', 'logo.png');
    const hasLogoFile = fs.existsSync(logoFilePath);

    const emailHtml = generateOtpEmailHtml({
      userName,
      otp: rawOtp,
      companyName,
      expiryMinutes: 10,
    });

    const mailResult = await sendMail({
      to: cleanEmail,
      subject: `${rawOtp} is your ${companyName} verification code`,
      html: emailHtml,
      attachments: hasLogoFile
        ? [
            {
              filename: 'logo.png',
              path: logoFilePath,
              cid: 'nexushr-logo',
            },
          ]
        : [],
    });

    if (!mailResult.success) {
      console.error('[AUTH] Gmail SMTP dispatch error:', mailResult.error);
      return NextResponse.json(
        { message: `Failed to send email via Gmail SMTP: ${mailResult.error || 'SMTP delivery failed'}` },
        { status: 500 }
      );
    }

    console.log(`[AUTH] Successfully sent verification OTP to ${cleanEmail} via Gmail SMTP (ID: ${mailResult.messageId})`);

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail inbox.`,
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ message: 'Internal server error processing reset request.' }, { status: 500 });
  }
}
