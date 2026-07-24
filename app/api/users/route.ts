import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { headers } from 'next/headers';

// GET - Fetch users
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    
    const query: any = {};
    
    if (queryCompanyId) {
      query.companyId = queryCompanyId;
    } else if (companyId) {
      query.companyId = companyId;
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
