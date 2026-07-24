import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkedDevice from '@/models/LinkedDevice';
import { headers } from 'next/headers';

// GET linked device for current user
export async function GET(req: Request) {
  try {
    await connectDB();
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const device = await LinkedDevice.findOne({ userId, isActive: true });
    return NextResponse.json(device);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching device', error: error.message }, { status: 500 });
  }
}

// POST link a new device
export async function POST(req: Request) {
  try {
    await connectDB();
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { deviceName, deviceId, platform, osVersion, model } = await req.json();

    if (!deviceName || !deviceId || !platform) {
      return NextResponse.json({ message: 'Missing required device details' }, { status: 400 });
    }

    // Check if user already has a device (One device per user rule)
    const existingDevice = await LinkedDevice.findOne({ userId });
    
    if (existingDevice) {
      // Update existing device instead of creating new one to maintain "one device" rule
      existingDevice.deviceName = deviceName;
      existingDevice.deviceId = deviceId;
      existingDevice.platform = platform;
      existingDevice.osVersion = osVersion;
      existingDevice.model = model;
      existingDevice.lastActive = new Date();
      existingDevice.isActive = true;
      await existingDevice.save();
      return NextResponse.json({ message: 'Device updated successfully', device: existingDevice });
    }

    const newDevice = await LinkedDevice.create({
      userId,
      deviceName,
      deviceId,
      platform,
      osVersion,
      model,
    });

    return NextResponse.json({ message: 'Device linked successfully', device: newDevice }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'This device is already linked to another account' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error linking device', error: error.message }, { status: 500 });
  }
}

// DELETE unlink device
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await LinkedDevice.findOneAndDelete({ userId });
    return NextResponse.json({ message: 'Device unlinked successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error unlinking device', error: error.message }, { status: 500 });
  }
}
