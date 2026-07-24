import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkedDevice from '@/models/LinkedDevice';
import { getAuthInfo } from '@/lib/auth-util';

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    
    // We also support body-based userId for admin overrides if needed
    const { bodyUserId } = await req.json().catch(() => ({}));
    const finalUserId = auth?.userId || bodyUserId;

    if (!finalUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const result = await LinkedDevice.deleteOne({ userId: finalUserId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'No linked device found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Device unlinked successfully' });
  } catch (error: any) {
    console.error('Device Unlink Error:', error);
    return NextResponse.json({ message: 'Error unlinking device' }, { status: 500 });
  }
}
