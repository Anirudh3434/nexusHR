import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';

export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const query: any = {};
    if (isSuperAdmin) {
      // super_admin may omit company filter to see all
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }

    const users = await User.find(query)
      .select('name email role department companyId isActive createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      count: users.length,
      users: users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        companyId: u.companyId?.toString(),
        isActive: u.isActive,
        createdAt: u.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Error fetching users', error: error.message },
      { status: 500 }
    );
  }
}
