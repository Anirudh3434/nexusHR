import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    const users = await User.find({})
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
