import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkedDevice from '@/models/LinkedDevice';
import { getAuthInfo } from '@/lib/auth-util';

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = auth;

    const { batteryLevel, batteryState, networkType, isConnected } = await req.json();

    const device = await LinkedDevice.findOneAndUpdate(
      { userId },
      { 
        batteryLevel, 
        batteryState, 
        networkType, 
        isConnected: isConnected ?? true,
        lastActive: new Date()
      },
      { new: true }
    );

    if (!device) {
      return NextResponse.json({ message: 'Device not paired' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Status synced' });
  } catch (error: any) {
    console.error('Device Sync Error:', error);
    return NextResponse.json({ message: 'Error syncing status' }, { status: 500 });
  }
}
