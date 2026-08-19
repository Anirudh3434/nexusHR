import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KRAuthToken from '@/models/QRAuthToken';
import User from '@/models/User';
import LinkedDevice from '@/models/LinkedDevice';
import jwt from 'jsonwebtoken';
import { emitToRoom } from '@/lib/socketEmit';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { token, deviceInfo } = await req.json();

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    // Find and validate the token
    const authRecord = await KRAuthToken.findOne({ 
      token, 
      isUsed: false,
      expiresAt: { $gt: new Date() } 
    });

    if (!authRecord) {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }

    // Mark token as used
    authRecord.isUsed = true;
    await authRecord.save();

    // Fetch user details
    const user = await User.findById(authRecord.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Generate JWT for the mobile session
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Pair device (Side-effect)
    await handleDevicePairing(user._id.toString(), deviceInfo);

    // Notify the web dashboard in real-time that the device is linked
    emitToRoom(user._id.toString(), 'device-linked-success', deviceInfo);

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    };

    return NextResponse.json({
      message: 'Login successful',
      user: userResponse,
      token: jwtToken,
    });
  } catch (error: any) {
    console.error('QR Verify Error:', error);
    return NextResponse.json({ message: 'Error verifying token' }, { status: 500 });
  }
}

// Side-effect: Handle device pairing if deviceInfo is provided
async function handleDevicePairing(userId: string, deviceInfo: any) {
  if (!deviceInfo) return;
  
  try {
    const { deviceId, deviceName, platform, model, osVersion } = deviceInfo;
    
    if (!deviceId) return;

    await LinkedDevice.findOneAndUpdate(
      { userId }, // Always one device per user in this implementation
      {
        userId,
        deviceId,
        deviceName: deviceName || 'Smartphone',
        platform: platform || 'Other',
        model,
        osVersion,
        lastActive: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to pair device during login:', err);
  }
}
