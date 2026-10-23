import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';

export async function GET() {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';

    const query: any = {};
    if (!isSuperAdmin) {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query._id = auth.companyId;
    }

    const companies = await Company.find(query)
      .select('name code email phone onboardingComplete isActive createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      count: companies.length,
      companies: companies.map(c => ({
        id: c._id.toString(),
        name: c.name,
        code: c.code,
        email: c.email,
        phone: c.phone,
        onboardingComplete: c.onboardingComplete,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }))
    });

  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { message: 'Error fetching companies', error: error.message },
      { status: 500 }
    );
  }
}
