import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// POST /api/auth/change-password
// body: { currentPassword, newPassword }
export async function POST(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Current and new passwords are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      return NextResponse.json({ message: 'New password must be different from the current one' }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return NextResponse.json({
      message: 'Password updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        companyId: user.companyId?.toString(),
        employeeId: user.employeeId,
        mustChangePassword: false,
      },
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
