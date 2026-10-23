import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailConfig from '@/models/EmailConfig';
import { getAuthInfo } from '@/lib/auth-util';
import { encryptToken } from '@/lib/email-token';

// GET email config (session-company scoped)
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth || !auth.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const companyId = auth.companyId;

    // Get config with accessToken to check connection status (explicitly select it)
    const config = await EmailConfig.findOne({ companyId, isActive: true })
      .select('+accessToken');

    if (!config) {
      return NextResponse.json({ message: 'No email config found' }, { status: 404 });
    }

    // Check if connected (has access token)
    const isConnected = !!config.accessToken;

    // Create response object without sensitive fields
    const configObj = config.toObject();
    delete configObj.accessToken;
    delete configObj.refreshToken;

    // Return config with connected status
    return NextResponse.json({
      ...configObj,
      connected: isConnected
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching config', error: error.message }, { status: 500 });
  }
}

// POST create/update email config (session-company scoped)
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth || !auth.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const data = await req.json();
    const companyId = auth.companyId;

    if (!data.provider || !data.careerEmail) {
      return NextResponse.json({ message: 'Provider and career email required' }, { status: 400 });
    }

    const toSave: any = {
      ...data,
      companyId,
      isActive: true,
      updatedAt: new Date()
    };
    // Encrypt tokens at rest.
    if (toSave.accessToken) toSave.accessToken = encryptToken(toSave.accessToken);
    if (toSave.refreshToken) toSave.refreshToken = encryptToken(toSave.refreshToken);

    // Upsert config
    const config = await EmailConfig.findOneAndUpdate(
      { companyId },
      toSave,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error saving config', error: error.message }, { status: 500 });
  }
}

// PATCH update specific fields (session-company scoped)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth || !auth.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { companyId: _ignored, ...updateData } = await req.json();
    const companyId = auth.companyId;

    const toUpdate: any = { ...updateData, updatedAt: new Date() };
    // Encrypt tokens at rest.
    if (toUpdate.accessToken) toUpdate.accessToken = encryptToken(toUpdate.accessToken);
    if (toUpdate.refreshToken) toUpdate.refreshToken = encryptToken(toUpdate.refreshToken);

    const config = await EmailConfig.findOneAndUpdate(
      { companyId },
      toUpdate,
      { new: true }
    ).select('-accessToken -refreshToken');

    if (!config) {
      return NextResponse.json({ message: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating config', error: error.message }, { status: 500 });
  }
}

// DELETE (deactivate) config (session-company scoped)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth || !auth.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const companyId = auth.companyId;

    const config = await EmailConfig.findOneAndUpdate(
      { companyId },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return NextResponse.json({ message: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Email config deactivated' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deactivating config', error: error.message }, { status: 500 });
  }
}
