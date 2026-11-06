import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import SuperAdmin from '@/models/SuperAdmin';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { token, otp, email, newPassword } = await req.json();

    const code = (otp || token || '').trim();

    if (!code || !email || !newPassword) {
      return NextResponse.json({ message: 'Verification code (OTP), email, and a new password are required.' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // 1. Check User model
    let targetDoc: any = await User.findOne({
      email: cleanEmail,
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    let isSuperAdmin = false;

    // 2. Fallback check SuperAdmin model
    if (!targetDoc) {
      targetDoc = await SuperAdmin.findOne({
        email: cleanEmail,
        resetPasswordToken: hashedCode,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+password +resetPasswordToken +resetPasswordExpires');

      if (targetDoc) {
        isSuperAdmin = true;
      }
    }

    if (!targetDoc) {
      return NextResponse.json(
        { message: 'Invalid or expired 6-digit verification code. Please check the code or request a new one.' },
        { status: 400 }
      );
    }

    // 3. Hash and store new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    targetDoc.password = hashedPassword;
    targetDoc.resetPasswordToken = undefined;
    targetDoc.resetPasswordExpires = undefined;
    targetDoc.mustChangePassword = false;
    // Invalidate existing sessions across all devices
    targetDoc.tokenVersion = (targetDoc.tokenVersion || 0) + 1;

    await targetDoc.save();

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
      isSuperAdmin,
    });
  } catch (error: any) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json({ message: 'Failed to reset password. Please try again.' }, { status: 500 });
  }
}
