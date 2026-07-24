import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthInfo } from '@/lib/auth-util';
import User from '@/models/User';

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

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
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
