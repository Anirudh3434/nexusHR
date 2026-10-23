import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';

// GET - Fetch users
export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const isSuperAdmin = auth.role === 'super_admin';

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');

    const query: any = {};

    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      // Non-admin: ignore ?companyId= override, default to session company
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }

    const users = await User.find(query)
      .select('name email department role companyId')
      .sort({ name: 1 });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Error fetching users', error: error.message }, { status: 500 });
  }
}
