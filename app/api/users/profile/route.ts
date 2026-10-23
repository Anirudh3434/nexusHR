import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET user profile
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    // Bind to session user by default; staff override only with admin/hr + same company
    let targetUserId = auth.userId;
    if (requestedUserId && requestedUserId !== auth.userId) {
      if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const requested = await User.findById(requestedUserId).select('companyId');
      if (!requested) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      if (auth.role !== 'super_admin' && requested.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
      }
      targetUserId = requestedUserId;
    }

    const user = await User.findById(targetUserId).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (auth.role !== 'super_admin' && user.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      employeeId: user.employeeId,
      companyId: user.companyId?.toString(),
      avatar: user.avatar,
      dob: user.dob,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      github: user.github,
      linkedin: user.linkedin,
      website: user.website,
      twitter: user.twitter,
      joiningDate: user.joiningDate,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ message: 'Error fetching profile', error: error.message }, { status: 500 });
  }
}

// PATCH update user profile (only editable fields)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });

    const { userId: bodyUserId, ...updateData } = data;

    // Bind to session user by default; staff override only with admin/hr + same company
    let targetUserId = auth.userId;
    if (bodyUserId && bodyUserId !== auth.userId) {
      if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const requested = await User.findById(bodyUserId).select('companyId');
      if (!requested) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      if (auth.role !== 'super_admin' && requested.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
      }
      targetUserId = bodyUserId;
    }

    // Only allow updating specific fields (not email, role, department, designation)
    const allowedFields = ['name', 'dob', 'phone', 'address', 'bio', 'github', 'linkedin', 'website', 'twitter', 'avatar'];
    const filteredUpdate: any = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      targetUserId,
      filteredUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (auth.role !== 'super_admin' && user.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        companyId: user.companyId?.toString(),
        avatar: user.avatar,
        dob: user.dob,
        phone: user.phone,
        address: user.address,
        bio: user.bio,
        github: user.github,
        linkedin: user.linkedin,
        website: user.website,
        twitter: user.twitter,
        joiningDate: user.joiningDate,
        isActive: user.isActive,
      }
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'Error updating profile', error: error.message }, { status: 500 });
  }
}
