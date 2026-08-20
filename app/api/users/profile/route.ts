import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET user profile
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
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
    const data = await req.json();
    
    const { userId, ...updateData } = data;
    
    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
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
      userId,
      filteredUpdate,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
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
