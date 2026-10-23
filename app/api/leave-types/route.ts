import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveType from '@/models/LeaveType';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET all leave types
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

    const query: any = { isActive: true };
    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }

    const leaveTypes = await LeaveType.find(query).sort({ name: 1 });
    return NextResponse.json(leaveTypes);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching leave types', error: error.message }, { status: 500 });
  }
}

// POST create leave type
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });

    if (data.companyId && !isSuperAdmin && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (data.companyId || auth.companyId) : auth.companyId;
    const { name, code, description, defaultDays, isPaid, color } = data;

    if (!name || !code || !companyId) {
      return NextResponse.json({ message: 'Name, code and companyId required' }, { status: 400 });
    }

    const leaveType = await LeaveType.create({ companyId, name, code, description, defaultDays, isPaid, color });
    return NextResponse.json(leaveType, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating leave type', error: error.message }, { status: 500 });
  }
}

// PATCH update leave type
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { id, name, code, description, defaultDays, isPaid, color, isActive } = body;
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await LeaveType.findById(id);
    if (!existing) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (defaultDays !== undefined) updateData.defaultDays = defaultDays;
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const leaveType = await LeaveType.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    if (!leaveType) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });

    return NextResponse.json(leaveType);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating leave type', error: error.message }, { status: 500 });
  }
}

// DELETE leave type
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await LeaveType.findById(id);
    if (!existing) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const leaveType = await LeaveType.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    if (!leaveType) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });

    return NextResponse.json({ message: 'Leave type deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting leave type', error: error.message }, { status: 500 });
  }
}
