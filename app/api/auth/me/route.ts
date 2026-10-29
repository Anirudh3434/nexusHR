import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthInfo } from '@/lib/auth-util';
import User from '@/models/User';
import Company from '@/models/Company';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await connectDB();
    
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = auth;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const company = user.companyId ? await Company.findById(user.companyId).select('name logo').lean() : null;
    const settings = user.companyId ? await Settings.findOne({ companyId: user.companyId }).select('logo primaryColor secondaryColor themeSource').lean() : null;

    const resolvedLogo = (settings as any)?.logo || (company as any)?.logo || '';
    const resolvedName = (company as any)?.name || '';

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyLogo: resolvedLogo,
      companyName: resolvedName,
      companyPrimaryColor: (settings as any)?.primaryColor || undefined,
      companySecondaryColor: (settings as any)?.secondaryColor || undefined,
      companyThemeSource: (settings as any)?.themeSource || undefined,
      department: user.department,
      designation: user.designation,
      avatar: user.avatar,
      status: user.status,
      joiningDate: user.joiningDate,
    });

  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
