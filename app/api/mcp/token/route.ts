import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth';
import { getAuthInfo } from '@/lib/auth-util';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const dbUser = await User.findById(auth.userId).select('-password').lean() as any;
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const permissions = Array.isArray(body.permissions) && body.permissions.length > 0 
      ? body.permissions 
      : ['read', 'write'];
    
    const modules = Array.isArray(body.modules) && body.modules.length > 0 
      ? body.modules 
      : ['tasks', 'attendance', 'leave', 'notices', 'employees'];

    // Generate dedicated MCP token valid for 365 days
    const payload = {
      id: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role || 'employee',
      companyId: dbUser.companyId?.toString(),
      type: 'mcp_token',
      mcpScopes: {
        permissions,
        modules,
      },
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '365d' });
    const formattedToken = `nx_mcp_${token}`;

    return NextResponse.json({
      success: true,
      token: formattedToken,
      rawToken: token,
      email: dbUser.email,
      role: dbUser.role,
      permissions,
      modules,
      expiresIn: '365d'
    });
  } catch (error: any) {
    console.error('MCP Token Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
