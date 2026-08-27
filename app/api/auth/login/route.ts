import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';
import Settings from '@/models/Settings';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Find user and select password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Filter out password from response
    const company = user.companyId ? await Company.findById(user.companyId).select('name logo').lean() : null;
    const settings = user.companyId ? await Settings.findOne({ companyId: user.companyId }).select('logo').lean() : null;
    const resolvedLogo = (settings as any)?.logo || (company as any)?.logo || '';
    const resolvedName = (company as any)?.name || '';

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      avatar: user.avatar,
      companyId: user.companyId?.toString(),
      companyLogo: resolvedLogo,
      companyName: resolvedName,
      workShiftId: user.workShiftId?.toString(),
      salary: user.salary,
      employeeId: user.employeeId,
      mustChangePassword: !!user.mustChangePassword,
      isCandidate: !!user.isCandidate,
    };

    return NextResponse.json({
      message: 'Login successful',
      user: userResponse,
      token,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
