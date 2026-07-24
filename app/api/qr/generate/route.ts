import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KRAuthToken from '@/models/QRAuthToken';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    await connectDB();
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');

    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Generate a secure random token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

    // Delete any existing tokens for this user to keep it clean
    await KRAuthToken.deleteMany({ userId });

    const newToken = await KRAuthToken.create({
      userId,
      companyId,
      token,
      expiresAt,
    });

    return NextResponse.json({
      token: newToken.token,
      expiresAt: newToken.expiresAt,
    });
  } catch (error: any) {
    console.error('QR Generate Error:', error);
    return NextResponse.json({ message: 'Error generating token' }, { status: 500 });
  }
}
