import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailConfig from '@/models/EmailConfig';

// GET email config
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

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

// POST create/update email config
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    if (!data.companyId || !data.provider || !data.careerEmail) {
      return NextResponse.json({ message: 'Company ID, provider, and career email required' }, { status: 400 });
    }

    // Upsert config
    const config = await EmailConfig.findOneAndUpdate(
      { companyId: data.companyId },
      { 
        ...data, 
        isActive: true,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error saving config', error: error.message }, { status: 500 });
  }
}

// PATCH update specific fields
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { companyId, ...updateData } = await req.json();

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const config = await EmailConfig.findOneAndUpdate(
      { companyId },
      { ...updateData, updatedAt: new Date() },
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

// DELETE (deactivate) config
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

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
